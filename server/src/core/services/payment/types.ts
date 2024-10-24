import { Subscription, SubscriptionStatus, Transaction, TransactionStatus, Plan } from '../../models.js';

export interface PaymentHandler {
    name(): string;
    initializeMetadata(tx: Transaction): Promise<Record<string, string>>;
    verifyTransaction(tx: Transaction): Promise<VerifyHandlerTransactionResult>;
    verifySubscription(sub: Subscription, plan: Plan, tx?: Transaction): Promise<VerifyHandlerSubscriptionResult>;
    getSubscriptionManagementUrl(sub: Subscription, plan: Plan): Promise<SubscriptionManagementResult>
}

export interface VerifyHandlerTransactionResult {
    status: TransactionStatus,
    providerId: string;
    metadata: Record<string, any>;
    errorMessage?: string;
    amount: number;
    currency: string;
}

export interface VerifyHandlerSubscriptionResult {
    status: SubscriptionStatus;
    willRenew: boolean;
    renewsAt?: Date;
    providerId?: string;
    cancelled?: boolean;
    attention?: boolean;
    metadata: Record<string, any>;
}

export interface SubscriptionManagementResult {
    link?: string;
}