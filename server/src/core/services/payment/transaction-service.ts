import { Db, Collection } from 'mongodb';
import { DateTime as LuxonDateTime } from 'luxon';
import { AuthContext, Subscription, Plan, Transaction, createPersistedModel, SubscriptionAndPlan } from '../../models.js';
import { rethrowIfAppError, createAppError, createResourceNotFoundError, createInvalidAppStateError, createResourceConflictError } from '../../error.js';
import { IPlanService } from './plan-service.js';
import { IPaymentHandlerProvider } from './payment-handler-provider.js';
import { PaymentHandler, SubscriptionManagementResult } from './types.js';

export const COLLECTION = 'transactions';
export const SUBSCRIPTION_COLLECTION = 'subscriptions';

export interface TransactionServiceConfig {
    plans: IPlanService;
    paymentHandlers: IPaymentHandlerProvider;
}

export class TransactionService {
    private collection: Collection<Transaction>;
    private subscriptionCollection: Collection<Subscription>;

    constructor(db: Db, private authContext: AuthContext, private config: TransactionServiceConfig) {
        this.collection = db.collection<Transaction>(COLLECTION);
        this.subscriptionCollection = db.collection<Subscription>(SUBSCRIPTION_COLLECTION);
    }

    async initiateSubscription(args: InitiateSubscrptionArgs): Promise<InitiateSubscriptionResult> {
        try {
            // check if the customer has a valid subscription already.
            // this helps prevent the customer from making another
            // transaction before a pending subscription has been confirmed.
            // In the future there could be scenarios where we want to allow
            // creating a transaction when one exists (e.g. plan upgrade),
            // we'll cross that bridge when we get there.
            if (await this.tryGetActiveOrPendingSubscription()) {
                throw createResourceConflictError(
                    'Unable to create the subscription because this account already ' +
                    'has an active or pending subscription. Please contact support if this is a mistake: support@quickbyte.io'
                );
            }

            const handler = this.config.paymentHandlers.getDefault();
            const plan =  await this.config.plans.getByName(args.plan);

            const subscription: Subscription = {
                ...createPersistedModel({ type: 'user', _id: this.authContext.user._id }),
                accountId: this.authContext.user.account._id,
                planName: plan.name,
                status: 'pending',
                willRenew: true,
                provider: handler.name(),
                lastTransactionId: '',
                metadata: {},
            };

            const transaction: Transaction = {
                ...createPersistedModel({ type: 'user', _id: this.authContext.user._id }),
                userId: this.authContext.user._id,
                subscriptionId: subscription._id,
                reason: 'subscription',
                status: 'pending',
                amount: plan.price,
                currency: plan.currency,
                provider: 'paystack',
                metadata: {}
            };

            const metadata = await handler.initializeMetadata(transaction);
            transaction.metadata = metadata;

            await this.collection.insertOne(transaction);

            subscription.lastTransactionId = transaction._id;
            await this.subscriptionCollection.insertOne(subscription);

            return {
                transaction,
                plan,
                subscription
            };
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async cancelTransaction(id: string): Promise<TransactionWithSubcription> {
        try {
            const txUpdate: Partial<Transaction> = {
                status: 'cancelled',
                _updatedAt: new Date(),
                _updatedBy: { _id: this.authContext.user._id, type: 'user' }
            };
            
            const result = await this.collection.findOneAndUpdate({
                _id: id,
                status: 'pending'
            }, {
                $set: txUpdate
            }, {
                returnDocument: 'after'
            });

            if (!result.value) {
               throw createResourceNotFoundError('Transaction does not exist or is already completed.');
            }

            // if associated with a subscription, then cancel that subscription as well
            const tx: TransactionWithSubcription = result.value;
            if (tx.reason === 'subscription' && tx.subscriptionId) {
                const subUpdate: Partial<Subscription> = {
                    status: 'inactive',
                    willRenew: false,
                    cancelled: true
                }

                const subResult = await this.subscriptionCollection.findOneAndUpdate({
                    _id: tx.subscriptionId
                }, {
                    $set: subUpdate
                }, {
                    returnDocument: 'after'
                });

                if (subResult.value) {
                    const plan = await this.config.plans.getByName(subResult.value.planName);
                    tx.subscription = { ...subResult.value, plan };
                }
            }

            return tx;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async verifyTransaction(id: string): Promise<TransactionWithSubcription> {
        try {
            const tx = await this.collection.findOne({ _id: id, userId: this.authContext.user._id });
            if (!tx) {
                throw createResourceNotFoundError('Transaction not found.');
            }

            // TODO: we should use an aggregation
            // to fetch the related subscription in a single
            // DB call.
            if (tx.status !== 'pending') {
                const txWithSub: TransactionWithSubcription = tx;
                if (tx.reason === 'subscription' && tx.subscriptionId) {
                    const sub = await this.subscriptionCollection.findOne({ _id: tx.subscriptionId });
                    
                    if (!sub) {
                        throw createAppError(`Cannot find subscription ${tx.subscriptionId} related to transaction ${tx._id}`);
                    }

                    // TODO: this is messy code, we store plan both as a field
                    // of the tx and of the sub. This is due some confusion
                    // on what is expected by the client. This should be cleaned up
                    const plan = await this.config.plans.getByName(sub.planName);
                    txWithSub.subscription = { ...sub, plan };
                    txWithSub.plan = plan;
                }

                return txWithSub;
            }

            const update: Partial<Transaction> = {};
            const provider = this.config.paymentHandlers.getByName(tx.provider);
            const providerResult = await provider.verifyTransaction(tx);
            update.status = providerResult.status;
            update.error = providerResult.errorMessage;
            if (providerResult.status === 'failed' && providerResult.errorMessage) {
                update.failureReason = 'error';
            }

            // TODO: maybe we should check if amounts match, and fail transaction if it's the case
            // But what if someone paid in a different currency and currency conversion made
            // the price different?

            update.metadata = { ...tx.metadata, ...providerResult.metadata };
            update.providerId = providerResult.providerId;
            update._updatedAt = new Date();
            update._updatedBy = {
                _id: this.authContext.user._id,
                type: 'user'
            };

            const updateResult = await this.collection.findOneAndUpdate({
                _id: id
            }, {
                $set: update
            }, {
                returnDocument: 'after'
            });

            if (!updateResult.value) {
                throw createAppError(`Failed to update transaction ${updateResult.lastErrorObject}`);
            }

            const result: TransactionWithSubcription = updateResult.value;

            if (result.reason === 'subscription' && result.subscriptionId) {
                const sub = await this.subscriptionCollection.findOne({ _id: result.subscriptionId });
                if (!sub) {
                    throw createInvalidAppStateError(
                        `Subscription '${result.subscriptionId} not found for transaction '${result._id}'.`
                    );
                }
                
                const updatedSub = await this.verifySubscriptionAtProvider(provider, sub, result);
                const plan = await this.config.plans.getByName(updatedSub.planName);
                result.subscription = { ...updatedSub, plan };
                result.plan = plan;
            }
            
            return result;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getActiveSubscription(): Promise<GetActiveSubscriptionResult> {
        const sub = await this.tryGetActiveSubscription();
        if (!sub) {
            throw createResourceNotFoundError('Your account does not have a valid subscription. Purchase a subscription plan and try again.');
        }

        return sub;
    }

    async tryGetActiveSubscription(): Promise<GetActiveSubscriptionResult|undefined> {
        try {
            const now = new Date();
            const sub = await this.subscriptionCollection.findOne({
                accountId: this.authContext.user.account._id,
                status: 'active',
                validFrom: { $lte: now},
                expiresAt: { $gt: now }
            });

            if (!sub) {
                return undefined;
            }

            return {
                ...sub,
                plan: await this.config.plans.getByName(sub.planName)
            }
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async tryGetActiveOrPendingSubscription(): Promise<SubscriptionAndPlan|undefined> {
        try {
            const now = new Date();
            const sub = await this.subscriptionCollection.findOne({
                accountId: this.authContext.user.account._id,
                status: { $ne: 'inactive' },
                validFrom: { $lte: now },
                expiresAt: { $gt: now }
            });

            if (!sub) {
                return undefined;
            }

            return {
                ...sub,
                plan: await this.config.plans.getByName(sub.planName)
            };
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getSubscriptionManagementUrl(subscriptionId: string): Promise<SubscriptionManagementResult> {
        try {
            const sub = await this.subscriptionCollection.findOne({
                accountId: this.authContext.user.account._id,
                _id: subscriptionId
            });

            if (!sub) {
                throw createResourceNotFoundError('The subscription does not exist.');
            }

            const handler = this.config.paymentHandlers.getByName(sub.provider);
            const plan = await this.config.plans.getByName(sub.planName);
            const result = await handler.getSubscriptionManagementUrl(sub, plan);

            return result;
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async verifySubscriptionAtProvider(handler: PaymentHandler, subscription: Subscription, transaction?: Transaction): Promise<Subscription> {
        try {
            const now = new Date();
            const plan = await this.config.plans.getByName(subscription.planName);
            const result = await handler.verifySubscription(subscription, plan, transaction);
            const subUpdate: Partial<Subscription> = {
                _updatedAt: now,
                _updatedBy: {
                    _id: this.authContext.user._id,
                    type: 'user'
                },
                status: result.status,
                willRenew: result.willRenew,
                providerId: result.providerId,
                metadata: result.metadata,
                cancelled: result.cancelled,
                renewsAt: result.renewsAt
            };

            if (subscription.status !== 'active' && result.status === 'active') {
                subUpdate.validFrom = now;
                // We use Luxon to compute the expiry date because it handles leap year
                // quirks for us.
                // If a subscription is created on day 28 or later of the month, then it will
                // be renewed on 28th of each subsequent month. This means that if the user
                // subscribes on 30th September then cancels the subscription, it would
                // end on 28th October, which is less than a month.
                // So instead, we use calculate the expiry date separately. Luxon ensures
                // handles month additions gracefully even when months have different number
                // of days.
                // For example, October 31 + 1 month = November 30
                // Jan 30 + 1 = Feb 28
                
                if (plan.renewalRate === 'monthly') {
                    subUpdate.expiresAt = LuxonDateTime.fromJSDate(now).plus({ months: 1 }).toJSDate();
                } else if (plan.renewalRate === 'annual')
                {
                    subUpdate.expiresAt = LuxonDateTime.fromJSDate(now).plus({ years: 1 }).toJSDate();
                } else {
                    subUpdate.expiresAt = result.renewsAt;
                }
            }
            // else if (result.status === 'active' && subscription.expiresAt && subscription.expiresAt?.getTime() <= Date.now()) {
            //     // TODO: we should use this logic only when we're certain
            //     // this is called only in response to a subscription renewal event
            //     // otherwise it can update the expiry when it shouldn't. For that reason, I've commented
            //     // out this block of code.
            //     // If we've crossed the expiry date, then update the expiry date to the next period
            //     const currentDate = LuxonDateTime.fromJSDate(subscription.expiresAt);
            //     const nextExpiry = plan.renewalRate === 'monthly' ?
            //         currentDate.plus({ months: 1 }).toJSDate() :
            //         plan.renewalRate === 'annual'?
            //         currentDate.plus({ years: 1 }).toJSDate() :
            //         result.renewsAt;
                
            //         subUpdate.expiresAt = nextExpiry;
            // }
            else {
                subUpdate.expiresAt = result.renewsAt;
            }

            const updateResult = await this.subscriptionCollection.findOneAndUpdate({
                _id: subscription._id
            }, {
                $set: subUpdate
            }, {
                returnDocument: 'after'
            });

            if (!updateResult.value) {
                throw createAppError(`Failed to update subscription ${updateResult.lastErrorObject}`);
            }

            return updateResult.value;
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type ITransactionService = Pick<TransactionService,
    'initiateSubscription'
    |'getActiveSubscription'
    |'tryGetActiveSubscription'
    |'tryGetActiveOrPendingSubscription'
    |'verifyTransaction'
    |'verifySubscriptionAtProvider'
    |'cancelTransaction'
    |'getSubscriptionManagementUrl'>;

export interface InitiateSubscrptionArgs {
    plan: string;
}

export interface InitiateSubscriptionResult {
    transaction: Transaction,
    plan: Plan,
    subscription: Subscription
}

export interface GetActiveSubscriptionResult extends Subscription {
    plan: Plan;
}

export interface TransactionWithSubcription extends Transaction {
    subscription?: SubscriptionAndPlan;
    plan?: Plan;
}
