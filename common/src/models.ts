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

export interface ParentDeleteable {
    parentDeleted?: boolean;
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
    /**
     * If this transfer is adding files to a project,
     * an optional folderId specifies which folder
     * to store the media items into. Essentially the path
     * to this folder is prefixed to the the paths of the files being uploaded.
     * If the folder does not exist, it will be ignored.
     * This field is ignore when `mediaId` is set because versions
     * of a media item are tied to the media item.
     */
    folderId?: string;
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
    playbackPackagingProvider?: string;
    playbackPackagingId?: string;
    playbackPackagingStatus?: PlaybackPackagingStatus;
    playbackPackagingError?: string;
    playbackPackagingErrorReason?: PlaybackPackagingErrorReason;
    playbackPackagingMetadata?: Record<string, any>;
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

export interface ProjectShare extends PersistedModel {
    name: string;
    /**
     * Project files can be shared through a public are sent via email
     * to invite users. When sent via email, a unique code is generated
     * for each recipient, this allows us to track which user opened the link.
     * Technically, the email recipient can still share their own link with others,
     * which will fool the system. But we should discourage recipients from doing that.
     */
    sharedWith: ProjectShareTarget[];
    projectId: string;
    enabled: boolean;
    /**
     * When set to true, users will be able to access the shared items based
     * on the public code. Otherwise, the public code will not be considered valid.
     */
    public: boolean;
    hasPassword: boolean;
    password?: string;
    expiresAt?: Date;
    allowDownload?: boolean;
    allowComments?: boolean;
    /**
     * When true, different versions of the media will be accessible,
     * otherwise only the preferred version will be accessible.
     */
    showAllVersions?: boolean;
    /**
     * When true, all items in the project are accessible, otherwise
     * only the items in the items array are accessible
     */
    allItems?: boolean;
    items?: ProjectShareItemRef[];
}

export type ProjectShareTarget = ProjectSharePublicCode | ProjectShareInviteCode;

export interface ProjectSharePublicCode {
    type: 'public';
    code: string;
}

export interface ProjectShareInviteCode {
    type: 'invite',
    code: string;
    email: string;
}

export interface ProjectShareItemRef {
    type: ProjectItemType,
    _id: string;
}

export interface PlaybackPackagingResult {
    providerId: string;
    status: PlaybackPackagingStatus;
    errorReason?: PlaybackPackagingErrorReason;
    error?: string;
    metatada: Record<any, any>;
}

export type PlaybackPackagingStatus = 'pending'|'progress'|'error'|'success';
export type PlaybackPackagingErrorReason = 'notMedia'|'serviceError';


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

export interface Project extends PersistedModel, Deleteable {
    name: string;
    description: string;
    accountId: string;
}

export interface Folder extends PersistedModel, Deleteable, ParentDeleteable {
    name: string;
    projectId: string;
    parentId?: string|null;
}

export interface FolderWithPath extends Folder {
    path: FolderPathEntry[];
}

export interface FolderPathEntry {
    name: string;
    _id: string;
}

export interface Media extends PersistedModel, Deleteable, ParentDeleteable {
    name: string;
    description?: string;
    projectId: string;
    preferredVersionId: string;
    versions: MediaVersion[];
    folderId?: string|null;
    // TODO: add file kind?
}

export type MediaWithUrls = Media & {
    thumbnailUrl?: string;
}

export type ProjectItem = ProjectFolderItem | ProjectMediaItem;
export type ProjectShareItem = ProjectFolderItem | ProjectShareMediaItem;

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

export interface ProjectShareMediaItem extends BaseProjectItem {
    type: "media",
    item: MediaWithFileAndComments
}

export type ProjectItemType = "folder"|"media";

export interface GetProjectItemsResult {
    folder?: FolderWithPath;
    items: ProjectItem[];
}

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

export type DownloadTransferFileResult = Pick<TransferFile, '_id'|'transferId'|'name'|'size'|'_createdAt'|'accountId'> & {
    downloadUrl: string;
    playbackPackagingStatus?: PlaybackPackagingStatus;
} & PlaybackUrls;

export interface MediaWithFileAndComments extends Media {
    versions: MediaVersionWithFile[];
    file: DownloadTransferFileResult;
    comments: WithChildren<CommentWithAuthor>[];
    thumbnailUrl?: string;
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


export type NonOwnerRoleType = 'reviewer'|'editor'|'admin';
export type RoleType = NonOwnerRoleType | 'owner';

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

export interface CreateTransferFileResult extends TransferFile {
    uploadUrl: string;
}

export interface CreateTransferResult extends Transfer {
    files: CreateTransferFileResult[]
}

export interface UploadMediaResult {
    media: Media[],
    folders?: Folder[],
    transfer: CreateTransferResult
}

export interface DeletionCountResult {
    deletedCount: number;
}

export interface PlaybackUrls {
    hlsManifestUrl?: string;
    dashManifestUrl?: string;
    thumbnailUrl?: string;
    posterUrl?: string;
}

export type WithCreator<T> = T & {
    creator: {
        _id: string;
        name: string;
    }
};