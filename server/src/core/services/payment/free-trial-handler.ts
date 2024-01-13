import { Transaction, Subscription, Plan } from '@quickbyte/common';
import { DateTime, DateTime as LuxonDateTime } from 'luxon';
import { PaymentHandler, SubscriptionManagementResult, VerifyHandlerSubscriptionResult, VerifyHandlerTransactionResult } from './types.js';

export const FREE_TRIAL_HANDLER_NAME = 'freeTrial';

export class FreeTrialHandler implements PaymentHandler {
    name(): string {
        return FREE_TRIAL_HANDLER_NAME;
    }
    initializeMetadata(tx: Transaction): Promise<Record<string, string>> {
        throw new Error('Method not implemented.');
    }
    verifyTransaction(tx: Transaction): Promise<VerifyHandlerTransactionResult> {
        throw new Error('Method not implemented.');
    }
    verifySubscription(sub: Subscription, plan: Plan, tx?: Transaction | undefined): Promise<VerifyHandlerSubscriptionResult> {
        if (sub.planName === FREE_TRIAL_HANDLER_NAME && plan.name === FREE_TRIAL_HANDLER_NAME) {
            return Promise.resolve({
                status: 'active',
                willRenew: true,
                renewsAt: DateTime.now().plus({ month: 1 }).toJSDate(),
                metadata: {}
            });
        }

        return Promise.resolve({
            status: 'inactive',
            willRenew: false,
            metadata: {},
        });
    }
    getSubscriptionManagementUrl(sub: Subscription, plan: Plan): Promise<SubscriptionManagementResult> {
        throw new Error('Method not implemented.');
    }

}