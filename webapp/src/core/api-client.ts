import type { UserAccount, StorageProvider, Transfer, TransferFile, Subscription, CreateProjectArgs, Media, MediaWithFile, Comment } from './types.js'
import type { SubscriptionAndPlan, WithRole, Project, MediaWithFileAndComments, RoleType } from "@quickbyte/common";

export interface ApiClientConfig {
    baseUrl: string;
    getToken: () => Promise<string|undefined>;
    onTokenExpired: () => unknown;
}

export class ApiClient {

    constructor(private config: ApiClientConfig) {
    }
    
    async getProviders(): Promise<StorageProvider[]> {
        const res = await fetch(`${this.config.baseUrl}/providers`, { mode: 'cors' });
        const data = await res.json();
        return data;
    }

    async getAccount(): Promise<UserAccount> {
        const res = await this.get<UserAccount>('me');
        return res;
    }

    /**
     * 
     * @param accountId 
     * @param args
     * @deprecated
     */
    async initTransfer(accountId: string, args: InitFileUploadArgs): Promise<InitFileUploadResult> {
        const token = await this.config.getToken();
        const res = await fetch(`${this.config.baseUrl}/accounts/${accountId}/files`, {
            method: 'POST',
            mode: 'cors',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(args)
        });

        const data = res.json();
        return data;
    }

    async createTransfer(accountId: string, args: CreateTransferArgs): Promise<CreateTransferResult> {
        const result = await this.makeRequest<CreateTransferResult>(
            `accounts/${accountId}/transfers`,
            'POST',
            args
        );
        
        return result;
    }

    async getTransfer(accountId: string, transferId: string): Promise<GetTransferResult> {
        const token = await this.config.getToken();
        const res = await fetch(`${this.config.baseUrl}/accounts/${accountId}/transfers/${transferId}`, {
            mode: 'cors',
            headers: {
                Authorization: `Bearer ${token}`,
            }
        });

        const data = await res.json();

        if (res.status >= 400) {
            const error = new ApiError(data.message, res.status, data.code);
            throw error;
        }

        return data;
    }

    async getFile(accountId: string, fileId: string): Promise<InitFileUploadResult> {
        const token = await this.config.getToken();
        const res = await fetch(`${this.config.baseUrl}/accounts/${accountId}/files/${fileId}`, {
            mode: 'cors',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await res.json();
        return data;
    }

    /**
     * 
     * @param accountId 
     * @param fileId
     * @deprecated
     */
    async requestDownload(accountId: string, fileId: string): Promise<DownloadRequestResult> {
        const token = await this.config.getToken();
        const res = await fetch(`${this.config.baseUrl}/accounts/${accountId}/files/${fileId}/download`, {
            mode: 'cors',
            headers: {
                Authorization: `Bearer ${token}`,
            }
        });

        const data = await res.json();

        if (res.status >= 400) {
            const error = new ApiError(data.message, res.status, data.code);
            throw error;
        }

        return data;
    }

    async finalizeTransfer(accountId: string, transferId: string, args: FinalizeTransferArgs): Promise<Transfer> {
        const data = await this.makeRequest<Transfer>(
            `accounts/${accountId}/transfers/${transferId}/finalize`,
            'POST',
            args,
            true);
        
        return data;
    }

    async getDownload(transferId: string, args: DownloadRequestArgs): Promise<DownloadRequestResult> {
        const data = await this.makeRequest<DownloadRequestResult>(
            `downloads/${transferId}`,
            'POST',
            args,
            false
        );

        return data;
    }

    async updateDownloadRequest(transferId: string, requestId: string, args: DownloadRequestUpdateArgs): Promise<void> {
        await this.makeRequest<void>(
            `downloads/${transferId}/requests/${requestId}`,
            'PATCH',
            args,
            false
        );
    }

    async initiateSubscription(accountId: string, args: { plan: string }): Promise<InitiateSubscriptionResult> {
        const result = await this.post<InitiateSubscriptionResult>(`accounts/${accountId}/subscriptions`, args);
        return result;
    }

    async getTransaction(accountId: string, transactionId: string): Promise<VerifyTransansactionResult> {
        const result = await this.get<any>(`accounts/${accountId}/transactions/${transactionId}`);
        return result;
    }

    async cancelTransaction(accountId: string, transactionId: string): Promise<VerifyTransansactionResult> {
        const result = await this.post<any>(`accounts/${accountId}/transactions/${transactionId}/cancel`);
        return result;
    }

    async getSubscriptionManagementUrl(accountId: string, subscriptionId: string): Promise<SubscriptionManagementResult> {
        const result = await this.post<SubscriptionManagementResult>(`accounts/${accountId}/subscriptions/${subscriptionId}/manage`);
        return result;
    }
    
    async getTransfers(accountId: string): Promise<Transfer[]> {
        const result = await this.get<Transfer[]>(`accounts/${accountId}/transfers`);
        return result;
    }

    async getProjects(accountId: string): Promise<Project[]> {
        return this.get<Project[]>(`accounts/${accountId}/projects`);
    }

    async getProject(accountId: string, projectId: string): Promise<Project> {
        return this.get<Project>(`accounts/${accountId}/projects/${projectId}`);
    }

    async createProject(accountId: string, args: CreateProjectArgs):  Promise<WithRole<Project>> {
        return this.post<WithRole<Project>>(`accounts/${accountId}/projects`, args);
    }

    async uploadProjectMedia(accountId: string, projectId: string, args: CreateProjectMediaUploadArgs): Promise<UploadMediaResult> {
        return this.post<UploadMediaResult>(`accounts/${accountId}/projects/${projectId}/upload`, args);
    }

    async getProjectMedia(accountId: string, projectId: string): Promise<Media[]> {
        return this.get<Media[]>(`accounts/${accountId}/projects/${projectId}/media`);
    }

    async getProjectMediumById(accountId: string, projectId: string, mediaId: string): Promise<MediaWithFileAndComments> {
        return this.get<MediaWithFileAndComments>(`accounts/${accountId}/projects/${projectId}/media/${mediaId}`);
    }

    async createMediaComment(accountId: string, projectId: string, mediaId: string, args: CreateMediaCommentArgs): Promise<Comment> {
        return this.post<Comment>(`accounts/${accountId}/projects/${projectId}/media/${mediaId}/comments`, args);
    }

    async inviteUsersToProject(accountId: string, projectId: string, args: InviteUserArgs): Promise<void> {
        return this.post(`accounts/${accountId}/projects/${projectId}/invite`, args);
    }

    private get<T>(endpoint: string, auth: boolean = true): Promise<T> {
        return this.makeRequest<T>(endpoint, 'GET', undefined, auth);
    }

    private post<T>(endpoint: string, body: any = undefined, auth: boolean = true): Promise<T> {
        return this.makeRequest<T>(endpoint, 'POST', body, auth);
    }

    private async makeRequest<TResult>(endpoint: string, method: string = 'GET', body: any = undefined, auth: boolean = true): Promise<TResult> {
        const url = `${this.config.baseUrl}/${endpoint}`;
        const headers: Record<string, string> = {};
        const options: RequestInit = {
            method,
            headers: {},
            mode: 'cors',
        };

        if (auth) {
            const token = await this.config.getToken();
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (body) {
            options.body = JSON.stringify(body);
            headers['Content-Type'] = 'application/json';
        }

        options.headers = headers;

        const res = await fetch(url, options);
        if (res.status >= 400) {
            if (res.headers.get('Content-Length')) {
                const data = await res.json();
                const error = new ApiError(data.message, res.status, data.code);
                if (/Invalid token/.test(data.message)) {
                    this.config.onTokenExpired();
                }
                throw error;
            } else {
                const error = new ApiError(res.statusText, res.status, 'UnknownError');
                throw error;
            }
        }

        try {
            const data = await res.json();
            return data;
        } catch (e: any) {
            if (!(/JSON/.test(e.message))) {
                throw e;
            }
        }

        // TODO: this is a hack to make the compiler accept the return type. The problem is that sometimes the return should be void
        // i.e. when there's no response body.
        return '' as any;
    }
}

export class ApiError extends Error {
    constructor(message: string, public readonly statusCode: number, public readonly code: string) {
        super(message);
    }
}

export interface InitFileUploadArgs {
    originalName: string;
    fileSize: number;
    provider: string;
    region: string;
    md5Hex: string;
    fileType: string;
}

export interface InitFileUploadResult {
    _id: string;
    secureUploadUrl: string;
}

export interface FinalizeTransferArgs {
    duration: number;
    recovered?: boolean;
}

export interface DownloadRequestArgs {
    ip?: string;
    countryCode?: string;
    userAgent?: string;
}

export interface DownloadRequestUpdateArgs {
    ip?: string;
    countryCode?: string;
    userAgent?: string;
    downloadAllZip?: boolean;
    requestedFiles?: string[];
}

export interface DownloadRequestResult {
    _id: string;
    name: string;
    files: {
        _id: string;
        name: string;
        size: number;
        downloadUrl: string;
    }[];
    downloadRequestId: string;
}

export interface CreateTransferArgs {
    name: string;
    provider: string;
    region: string;
    files: CreateTransferFileArgs[];
    meta?: CreateTransferMeta
}

export interface CreateTransferFileArgs {
    name: string;
    size: number;
}

export interface CreateTransferResult extends Transfer {
    files: CreateTransferFileResult[]
}

export type GetTransferResult = CreateTransferResult;

export interface CreateTransferFileResult extends TransferFile {
    _id: string,
    name: string,
    uploadUrl: string;
}

export interface InitiateSubscriptionResult {
    plan: {
        name: string;
        price: number;
        providerIds: {
            paystack: string;
        }
    },
    transaction: {
        _id: string;
        provider: string;
        metadata: Record<string, any>;
        status: TransactionStatus;
    },
    subscription: Subscription
}

export interface VerifyTransansactionResult {
    _id: string;
    provider: string;
    amount: number;
    currency: string;
    metadata: Record<string, any>;
    status: TransactionStatus;
    error?: string;
    failureReason?: 'error'|'amountMismatch'|'other';
    subscription: SubscriptionAndPlan,
    plan: {
        name: string;
        displayName: string;
    }
}

export type TransactionStatus = 'pending' | 'success' | 'cancelled' | 'failed';

export interface SubscriptionManagementResult {
    link: string;
}

export interface CreateProjectMediaUploadArgs {
    mediaId?: string;
    folderId?: string;
    provider: string;
    region: string;
    files: CreateTransferFileArgs[];
    meta?: CreateTransferMeta;
}

interface CreateTransferMeta {
    ip?: string;
    countryCode?: string;
    state?: string;
    userAgent?: string;
}

export interface UploadMediaResult {
    media: Media[],
    transfer: CreateTransferResult
}

export interface CreateMediaCommentArgs {
    mediaVersionId: string;
    text: string;
    timestamp?: number;
}

export interface InviteUserArgs {
    users: { email: string }[];
    message?: string;
    role: RoleType;
}