import { Db, Collection } from 'mongodb';
import { AuthContext, Subscription, Plan, Transaction, createPersistedModel } from '../../models.js';
import { rethrowIfAppError, createAppError, createResourceNotFoundError } from '../../error.js';
import { IPlanService } from './plan-service.js';
import { IPaymentHandlerProvider } from './payment-handler-provider.js';

const COLLECTION = 'transactions';
const SUBSCRIPTION_COLLECTION = 'subscriptions';

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
            const handler = this.config.paymentHandlers.getDefault();
            const plan =  await this.config.plans.getByName(args.plan);
            const subscription = await this.createSubscription(plan);

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
            console.log('tx', transaction);

            await this.collection.insertOne(transaction);


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

    async verifyTransaction(id: string): Promise<Transaction> {
        try {
            const tx = await this.collection.findOne({ _id: id, userId: this.authContext.user._id });
            if (!tx) {
                throw createResourceNotFoundError('Transaction not found.');
            }

            if (tx.status !== 'pending') {
                // transaction already final
                return tx;
            }

            const update: Partial<Transaction> = {};
            const provider = this.config.paymentHandlers.getByName(tx.provider);
            const result = await provider.verifyTransaction(tx);
            update.status = result.status;
            update.error = result.errorMessage;
            if (result.status === 'failed' && result.errorMessage) {
                update.failureReason = 'error';
            }

            // TODO: maybe we should check if amounts match, and fail transaction if it's the case
            // But what if someone paid in a different currency and currency conversion made
            // the price different?

            update.metadata = { ...tx.metadata, ...result.metadata };
            update.providerId = result.providerId;

            // TODO: we should also update the subscription and mark it active

            const updateResult = await this.collection.findOneAndUpdate({
                _id: id
            }, {
                $set: update
            }, {
                returnDocument: 'after'
            });

            if (updateResult.value) {
                return updateResult.value;
            }

            throw createAppError(`Failed to update transaction ${updateResult.lastErrorObject}`);

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
                validFrom: { $gte: now},
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

    private async createSubscription(plan: Plan): Promise<Subscription> {
        try {
            const subscription: Subscription = {
                ...createPersistedModel({ type: 'user', _id: this.authContext.user._id }),
                accountId: this.authContext.user.account._id,
                planName: plan.name,
                status: 'pending'
            };

            await this.subscriptionCollection.insertOne(subscription);

            return subscription;
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type ITransactionService = Pick<TransactionService, 'initiateSubscription'|'getActiveSubscription'|'tryGetActiveSubscription'|'verifyTransaction'>;

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
