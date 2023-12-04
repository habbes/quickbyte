import { Db, Collection } from 'mongodb';
import { Transaction, Subscription } from '../../models.js';
import { rethrowIfAppError, createAppError, createResourceNotFoundError } from '../../error.js';

import {
SUBSCRIPTION_COLLECTION,
COLLECTION,
TransactionServiceConfig
} from './transaction-service.js';
import { AppServices } from '../../bootstrap.js';

// TODO: this class is poorly designed, need a more maintainable
// way to handle payment provider webhooks without tight
// coupling.
export class UnauthenticatedTransactionService {
    private collection: Collection<Transaction>;
    private subCollection: Collection<Subscription>;

    constructor(private db: Db, private config: TransactionServiceConfig) {
        this.collection = db.collection<Transaction>(COLLECTION);
        this.subCollection = db.collection<Subscription>(SUBSCRIPTION_COLLECTION);
    }

    async getSubscriptionByProviderAndId(provider: string, providerId: string): Promise<Subscription> {
        try {
            const sub = await this.subCollection.findOne({
                provider,
                providerId: String(providerId)
            });

            if (!sub) {
                throw createResourceNotFoundError('Could not find subscription.');
            }

            return sub;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async handlePaystackEvent(event: PaystackEvent, appServices: AppServices) {
        console.log('paystack event', event);
        if (event.event.startsWith('subscription')) {
            await this.handleSubscriptionEvent(event, appServices);
        }
        else if (event.event == 'invoice.update') {
            await this.handleInvoiceUpdateEvent(event, appServices);
        }

        console.log('Event not handled', event.event);
    }

    async handleSubscriptionEvent(event: PaystackEvent, appServices: AppServices) {
        try {
            const handler = await this.config.paymentHandlers.getByName('paystack');
            // find subscription and updated
            const sub = await this.getSubscriptionByProviderAndId('paystack', String(event.data.id));
            // verify the subscription
            // find user and account
            const account = await appServices.accounts.getById(sub.accountId);
            const user = await appServices.auth.getUserById(account.owner._id);

            const authContext = { user: { ...user, account } };
            const txService = appServices.accounts.transactions(authContext);
            
            await txService.verifySubscriptionAtProvider(handler, sub);
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async handleInvoiceUpdateEvent(event: PaystackEvent, appServices: AppServices) {
        try {
            // TODO: Since we have a the subscription and the charge,
            // we could technically update the transaction and subscription details without
            // having to make an extra call to paystack or all the db calls
            // but I opted to re-use already existing code to implement this quicker
            // even if it's less efficient. Might come back to improve this later.
            const handler = await this.config.paymentHandlers.getByName('paystack');
            // find subscription
            console.log('subscription id', event.data.subscription.id, 'subscription code', event.data.subscription.subscription_code);
            const sub = await this.getSubscriptionByProviderAndId('paystack', String(event.data.subscription.id));

            // verify the subscription
            // find user and account
            const account = await appServices.accounts.getById(sub.accountId);
            const user = await appServices.auth.getUserById(account.owner._id);
            const authContext = { user: { ...user, account } };
            const txService = appServices.accounts.transactions(authContext);

            await txService.verifySubscriptionAtProvider(handler, sub);
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

interface PaystackEvent {
    event: string;
    data: any;
}

interface SubscriptionEvent {
    event: string;
    data: Subscription;
}

export type IUnauthenicatedTransactionService = Pick<UnauthenticatedTransactionService, 'getSubscriptionByProviderAndId'|'handlePaystackEvent'>;
