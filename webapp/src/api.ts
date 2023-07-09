import { getToken } from './auth.js';
import { RegionInfo } from './types.ts'

const baseUrl = import.meta.env.VITE_API_BASE_URL;


class ApiClient {
    
    async getProviders(): Promise<StorageProvider[]> {
        const res = await fetch(`${baseUrl}/providers`, { mode: 'cors' });
        const data = await res.json();
        console.log('data', data);
        return data;
    }

    async getAccount(): Promise<UserAccount> {
        const token = await getToken();
        const res = await fetch(`${baseUrl}/me`, {
            mode: 'cors',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const data = await res.json();
        return data;
    }

    async initTransfer(accountId: string, args: InitFileUploadArgs): Promise<InitFileUploadResult> {
        const token = await getToken();
        const res = await fetch(`${baseUrl}/accounts/${accountId}/files`, {
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

    async requestDownload(accountId: string, fileId: string): Promise<DownloadRequestResult> {
        const token = await getToken();
        const res = await fetch(`${baseUrl}/accounts/${accountId}/files/${fileId}/download`, {
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
        const res = await fetch(`${baseUrl}/downloads/${downloadId}`, {
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

export const apiClient = new ApiClient();

interface StorageProvider {
    name: string;
    availableRegions: RegionInfo[]
}

interface UserAccount {
    _id: string;
    name: string;
    email: string;
    aadId: string;
    account: {
        _id: string;
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