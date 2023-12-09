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

export interface BaseUser extends PersistedModel {
    email: string;
    name: string;
    invitedBy?: Principal;
}

export interface FullUser extends BaseUser {
    aadId: string;
    isGuest?: false|undefined;
}

export interface GuestUser extends BaseUser {
    isGuest: true;
}

export type User = FullUser | GuestUser;

export interface UserWithAccount extends FullUser {
    account: AccountWithSubscription
};

export interface AccountWithSubscription extends Account {
    subscription?: SubscriptionAndPlan;
}

export interface SubscriptionAndPlan extends Subscription {
    plan: Plan;
}

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
    numFiles: number;
    totalSize: number;
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
    provider: string;
    region: string;
}

export interface Upload extends PersistedModel {
    fileId: string;
    blockSize: number;
    blocksCompleted: number;
}

export interface DownloadRequest extends PersistedModel {
    transferId: string;
    ip?: string;
    countryCode?: string;
    userAgent?: string;
    downloadAllZip?: string;
    filesRequested?: string[];
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
    lastTransactionId: string;
    planName: string;
    willRenew: boolean;
    renewsAt?: Date;
    cancelled?: boolean;
    attention?: boolean;
    validFrom?: Date;
    expiresAt?: Date;
    status: SubscriptionStatus,
    metadata: Record<string, any>;
    provider: string;
    providerId?: string;
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
    maxTransferValidity?: number;
}

export type PlanRenewalRate = 'monthly'|'annual';

export interface Project extends PersistedModel {
    name: string;
    accountId: string;
}

export interface Media extends PersistedModel {
    name: string;
    description?: string;
    projectId: string;
    fileKind: FileKind;
    preferredVersionId: string;
}

export interface MediaVersion extends PersistedModel {
    name: string;
    fileId: string;
    mediaId: string;
}

export interface Comment extends PersistedModel {
    text: string;
    projectId: string;
    mediaId: string;
    mediaVersionId: string;
    hasTimestamp: boolean;
    timestampMicroseconds?: number;
}

export interface CommentRead extends PersistedModel {
    readBy: Principal
}

export type FileKind = 'video'|'image'|'audio'|'document'|'other';

export interface UserInvite extends PersistedModel {
    email: string;
    name?: string;
    message?: string;
    resource: NamedResource;
    expiresAt: Date;
}

export interface ResourceReference {
    type: ResourceType;
    id: string;
}

export interface NamedResource extends ResourceReference {
    name?: string;
}

export type ResourceType = 'project';
export type InviteResourceAccess = 'review';