import { Transaction, TransactionStatus } from '../../models.js';

export interface PaymentHandler {
    name(): string;
    initializeMetadata(tx: Transaction): Promise<Record<string, string>>;
    verifyTransaction(tx: Transaction): Promise<VerifyTransactionResult>;
}

export interface VerifyTransactionResult {
    status: TransactionStatus,
    providerId: string;
    metadata: Record<string, any>;
    errorMessage?: string;
    amount: number;
    currency: string;
}