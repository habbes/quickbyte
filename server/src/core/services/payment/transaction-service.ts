import { Db, Collection } from 'mongodb';
import { AuthContext, Subscription, Plan, Transaction, createPersistedModel } from '../../models.js';
import { rethrowIfAppError, createAppError } from '../../error.js';
import { IPlanService } from './plan-service.js';

const COLLECTION = 'transactions';
const SUBSCRIPTION_COLLECTION = 'subscriptions';

export interface TransactionServiceConfig {
    plans: IPlanService;
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

export type ITransactionService = Pick<TransactionService, 'initiateSubscription'>;

export interface InitiateSubscrptionArgs {
    plan: string;
}

export interface InitiateSubscriptionResult {
    transaction: Transaction,
    plan: Plan,
    subscription: Subscription
}