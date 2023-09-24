import { generateId } from "./utils.js";

export function createPersistedModel(createdBy: Principal | string): PersistedModel {
    const now = new Date();

    const principal: Principal = typeof createdBy === 'string' ? { type: 'user', _id: createdBy } : createdBy;

    return {
        _id: generateId(),
        _createdAt: now,
        _createdBy: principal,
        _updatedAt: now,
        _updatedBy: principal
    }
}

export interface PersistedModel {
    _id: string;
    _createdAt: Date;
    _updatedAt: Date;
    _createdBy: Principal;
    _updatedBy: Principal;
}

export type Principal = {
    type: 'user',
    _id: string;
} | typeof SystemPrincipal;

export const SystemPrincipal = { type: 'system' as const, _id: 'system' as const};

export interface Account extends PersistedModel {
    owner: Principal;
}

export interface User extends PersistedModel {
    email: string;
    name: string;
    aadId: string;
}

export interface UserWithAccount extends User {
    account: Account
};

export interface AuthContext {
    user: UserWithAccount;
}

export type FileStatus = 'pending' | 'uploaded' | 'uploading';

export interface File extends PersistedModel {
    provider: string;
    region: string;
    accountId: string;
    path: string;
    originalName: string;
    fileSize: number;
    status: FileStatus;
    md5Hex: string;
    fileType: string;
}

export interface Transfer extends PersistedModel {
    provider: string;
    region: string;
    accountId: string;
    name: string;
    status: TransferStatus;
    expiresAt: Date;
    transferCompletedAt?: Date;
    // TODO: this field should be required after the preview
    numFiles?: number;
    // TODO: this field should be required after the preview
    totalSize?: number;
}

export interface DbTransfer extends Transfer {
    meta?: {
        ip?: string;
        countryCode?: string;
        userAgent?: string;
        duration?: number;
        recovered?: boolean;
    }
}

export type TransferStatus = 'pending' | 'progress' | 'completed';

export interface TransferFile extends PersistedModel {
    transferId: string;
    name: string;
    size: number;
}

export interface Upload extends PersistedModel {
    fileId: string;
    blockSize: number;
    blocksCompleted: number;
}

/**
 * @deprecated
 */
export interface Download extends PersistedModel {
    fileId: string;
    accountId: string;
    numRequests: number;
    fileSize: number;
    provider: string;
    region: string;
    originalName: string;
    downloadUrl: string;
    expiryDate: Date;
    fileType: string;
}

export interface DownloadRequest extends PersistedModel {
    transferId: string;
    ip?: string;
    countryCode?: string;
    userAgent?: string;
    downloadAllZip?: string;
    filesRequested?: string[];
}

/**
 * @deprecated Should be removed after preview
 */
export interface PreviewUser extends PersistedModel {
    email: string;
    countryCode?: string;
    userAgent?: string;
    ip?: string;
}

export interface Transaction extends PersistedModel {
    userId: string;
    status: TransactionStatus;
    error?: string;
    failureReason?: FailureReason;
    amount: number;
    currency: string;
    provider: string;
    providerId?: string;
    metadata: Record<string, any>;
    reason: TransactionReason;
    subscriptionId?: string;
}

export type TransactionStatus = 'pending' | 'success' | 'cancelled' | 'failed';
export type FailureReason = 'error'|'amountMismatch'|'other';
export type TransactionReason = 'subscription';

export interface Subscription extends PersistedModel {
    accountId: string;
    planName: string;
    nextRenewalDate?: Date;
    expiryDate?: Date;
    status: SubscriptionStatus,
}

export type SubscriptionStatus = 'pending' | 'active' | 'inactive';

export interface Plan {
    name: string;
    displayName: string;
    price: number;
    currency: string;
    renewalRate: PlanRenewalRate;
    maxTransferSize: number;
    maxStorageSize: number;
    providerIds: Record<string, string>;
}

export type PlanRenewalRate = 'monthly';