import type { UserAccount, StorageProvider } from './types.js'

export interface ApiClientConfig {
    baseUrl: string;
    getToken: () => Promise<string>;
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
        const token = await this.config.getToken();
        const res = await fetch(`${this.config.baseUrl}/me`, {
            mode: 'cors',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const data = await res.json();
        return data;
    }

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

    async getDownload(downloadId: string): Promise<DownloadRequestResult> {
        const res = await fetch(`${this.config.baseUrl}/downloads/${downloadId}`, {
            mode: 'cors'
        });

        const data = await res.json();

        if (res.status >= 400) {
            const error = new ApiError(data.message, res.status, data.code);
            throw error;
        }

        return data;
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

export interface DownloadRequestResult {
    _id: string;
    fileId: string;
    downloadUrl: string;
    fileSize: number;
    originalName: string;
    fileType: string;
}