import { Subscription, SubscriptionStatus, Transaction, TransactionStatus } from '../../models.js';

export interface PaymentHandler {
    name(): string;
    initializeMetadata(tx: Transaction): Promise<Record<string, string>>;
    verifyTransaction(tx: Transaction): Promise<VerifyTransactionResult>;
    verifySubscription(tx: Transaction, sub: Subscription): Promise<VerifySubscriptionResult>;
}

export interface VerifyTransactionResult {
    status: TransactionStatus,
    providerId: string;
    metadata: Record<string, any>;
    errorMessage?: string;
    amount: number;
    currency: string;
}

export interface VerifySubscriptionResult {
    status: SubscriptionStatus;
    willRenew: boolean;
    renewsAt?: Date;
    providerId?: string;
    metadata: Record<string, any>;
}