export interface RegionInfo {
    id: string;
    name: string;
    pingUrl: string;
}

export interface User {
    aadId: string;
    name: string;
    email: string;
}

export interface UserAccount {
    _id: string;
    name: string;
    email: string;
    aadId: string;
    account: {
        _id: string;
        subscription?: Subscription;
    }
}

export interface Subscription {
    _id: string;
    accountId: string;
    lastTransactionId: string;
    planName: string;
    renewsAt?: string;
    validFrom?: string;
    expiresAt?: string;
    willRenew: boolean;
    status: 'pending'|'active'|'inactive';
    plan: {
        name: string;
        displayName: string;
        price: number;
        currency: string;
        renewalRate: 'monthly';
        maxTransferSize: number;
        maxStorageSize: number;
        providerIds: Record<string, string>;
        maxTransferValidity?: number;
    }
}

export interface StorageProvider {
    name: string;
    availableRegions: RegionInfo[]
}

export type Principal = {
    type: 'user',
    _id: string;
} | {
    type: 'system',
    _id: 'system'
}

export interface Account extends PersistedModel {
    owner: Principal;
}

export interface PersistedModel {
    _id: string;
    _createdAt: Date;
    _updatedAt: Date;
    _createdBy: Principal;
    _updatedBy: Principal;
}


export interface Transfer extends PersistedModel {
    provider: string;
    region: string;
    accountId: string;
    name: string;
    status: TransferStatus;
    expiresAt: Date;
    totalSize: number;
    numFiles: number;
    transferCompletedAt: string;
}

export type TransferStatus = 'pending' | 'progress' | 'completed';

export interface TransferFile extends PersistedModel {
    transferId: string;
    name: string;
    size: number;
}