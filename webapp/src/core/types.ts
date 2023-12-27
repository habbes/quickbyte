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
    projectId?: string;
    hidden?: boolean;
}

export type TransferStatus = 'pending' | 'progress' | 'completed';

export interface TransferFile extends PersistedModel {
    transferId: string;
    name: string;
    size: number;
}

export interface Project extends PersistedModel {
    name: string;
    description: string;
}

export interface CreateProjectArgs {
    name: string;
    description: string;
}

export interface Media extends PersistedModel {
    name: string;
    description?: string;
    projectId: string;
    preferredVersionId: string;
    versions: MediaVersion[];
    // TODO: add file kind?
}

export interface MediaWithFile extends Media {
    file: {
        _id: string;
        name: string;
        downloadUrl: string;
        provider: string;
        region: string;
        size: number;
    },
    comments: Comment[];
}

export interface MediaVersion extends PersistedModel {
    name: string;
    fileId: string;
}

export interface Comment extends PersistedModel {
    text: string;
    projectId: string;
    mediaId: string;
    mediaVersionId: string;
    timestamp?: number;
    author: {
        _id: string;
        name: string;
    }
}

export interface TimedComment extends Comment {
    timestamp: number;
}

export type RoleType = 'reviewer'|'editor'|'admin';