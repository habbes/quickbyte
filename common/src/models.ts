export interface PersistedModel {
    _id: string;
    _createdAt: Date;
    _updatedAt: Date;
    _createdBy: Principal;
    _updatedBy: Principal;
}

export interface Deleteable {
    deleted?: boolean;
    // TODO: should be _deletedBy, _deletedAt for consistency
    deletedBy?: Principal;
    deletedAt?: Date;
}

export type Principal = {
    type: 'user',
    _id: string;
} | typeof SystemPrincipal;

export const SystemPrincipal = { type: 'system' as const, _id: 'system' as const};

export interface Account extends PersistedModel {
    name: string;
    owner: Principal;
}

export interface BaseUser extends PersistedModel {
    email: string;
    name: string;
    invitedBy?: Principal;
    // auth provider
    provider?: AuthProvider;
    providerId?: string;
}

export type AuthProvider = 'email'|'google';

export interface UserDbOnlyFields {
    password: string;
}

export interface FullUser extends BaseUser {
    /**
     * ID of the user in Azure AD. No longer user
     * for new user accounts.
     * @deprecated
     */
    aadId?: string;
    isGuest?: false|undefined;
    /**
     * This field was introduced when migrating from Azure AD to a custom
     * auth implementation. Users that already existed in the db
     * at that point did not have the verified field even though
     * they were technically verified by AAD.
     * For backwards compatibility, we consider users verified when
     * either this field is set to true or when aadId is set.
     */
    verified?: boolean;
    /**
     * Password is optional because we did not handle user password before
     * migrating from Azure AD. But each new user account requires a password.
     * Older accounts will need to create a password through the password reset
     * flow before they can access their accounts again.
     */
    password?: string;
}

export interface GuestUser extends BaseUser {
    isGuest: true;
}

export type User = FullUser | GuestUser;

export type FullUserInDb = FullUser & UserDbOnlyFields;
export type UserInDb = FullUserInDb | GuestUser;

export interface UserWithAccount extends FullUser {
    /**
     * The user's personal account (i.e. the account owned by this user).
     */
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
    /**
     * Hidden transfers are not shareable
     * and not visible to the end user,
     * they're meant to be used to upload project
     * media assets
     */
    hidden?: boolean;
    /**
     * If this transfer is meant for a project,
     * then this is the project it belongs to.
     */
    projectId?: string;
    /**
     * If this transfer is meant for a media item,
     * then the file(s) will be added as new versions
     * to the media
     */
    mediaId?: string;
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
    // TODO: this should be required, but was introduced later
    // we should update all existing transfer files with an account id
    accountId?: string;
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
    description: string;
    accountId: string;
}

export interface Folder extends PersistedModel {
    name: string;
    projectId: string;
    parentId?: string|null;
}

export interface Media extends PersistedModel {
    name: string;
    description?: string;
    projectId: string;
    preferredVersionId: string;
    versions: MediaVersion[];
    folderId?: string;
    // TODO: add file kind?
}

export type ProjectItem = ProjectFolderItem | ProjectMediaItem;

export interface BaseProjectItem {
    _id: string;
    name: string;
    _createdAt: Date;
    _updatedAt: Date;
}

export interface ProjectFolderItem extends BaseProjectItem {
    type: "folder";
    item: Folder;
}

export interface ProjectMediaItem extends BaseProjectItem {
    type: "media";
    item: Media
}

export type ProjectItemType = "folder"|"media";

export interface MediaVersion extends PersistedModel {
    name: string;
    fileId: string;
}

export interface Comment extends PersistedModel, Deleteable {
    text: string;
    projectId: string;
    mediaId: string;
    mediaVersionId: string;
    timestamp?: number;
    parentId?: string;
}

export interface CommentWithAuthor extends Comment {
    author: {
        _id: string;
        name: string;
    }
}

export interface TimedCommentWithAuthor extends CommentWithAuthor {
    timestamp: number;
}

export type WithChildren<T> = T & {
    children: T[];
}

export type FileKind = 'video'|'image'|'audio'|'document'|'other';

export interface DownloadTransferFileResult extends Pick<TransferFile, '_id'|'transferId'|'name'|'size'|'_createdAt'|'accountId'> {
    downloadUrl: string;
}

export interface MediaWithFileAndComments extends Media {
    versions: MediaVersionWithFile[];
    file: DownloadTransferFileResult;
    comments: WithChildren<CommentWithAuthor>[];
}

export interface MediaVersionWithFile extends MediaVersion {
    file: DownloadTransferFileResult;
}


export interface UserInvite extends PersistedModel {
    email: string;
    name?: string;
    message?: string;
    resource: NamedResource;
    role: RoleType;
    expiresAt: Date;
}

export type UserInviteWithSender = UserInvite & {
    sender: {
        name: string;
        email: string;
    }
}

export type RecipientInvite = UserInviteWithSender & {
    secret: string;
}

export interface ResourceReference {
    type: ResourceType;
    id: string;
}

export interface NamedResource extends ResourceReference {
    name?: string;
}

export interface ProjectResource extends ResourceReference {
    type: 'project',
    object: WithRole<Project>
}

// this will be a union of all supported resource types
export type Resource = ProjectResource;

export type ResourceType = 'project';
export type InviteResourceAccess = 'review';

export interface UserRole extends PersistedModel {
    userId: string;
    role: RoleType;
    resourceType: ResourceType;
    resourceId: string;
}

export type RoleType = 'reviewer'|'editor'|'admin'|'owner';

export type WithRole<T> = T & { role: RoleType };

export interface BasicUserData {
    user: UserWithAccount;
    accounts: AccountWithSubscription[];
    projects: WithRole<Project>[];
    invites: RecipientInvite[];
    defaultProjectId?: string;
    defaultAccountId: string;
}


export interface ProjectMember {
    _id: string;
    name: string;
    email: string;
    role: RoleType;
    joinedAt: Date;
}


export type UserAuthMethodResult = {
    exists: true;
    provider: AuthProvider
    verified: boolean;
} | {
    exists: false;
}

export interface UserVerification extends PersistedModel {
    code: string;
    type: UserVerificationType;
    expiresAt: Date;
    userId: string;
    email: string;
}

export type UserVerificationType = 'email';

export interface AuthToken extends PersistedModel {
    code: string;
    userId: string;
    expiresAt: Date;
    ip?: string;
    countryCode?: string;
    userAgent?: string;
}

export type UserAndToken = {
    authToken: AuthToken;
    user: UserWithAccount;
} | {
    user: FullUser
}
