import { getToken } from './auth.js';

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
        return data;
    }
}

export const apiClient = new ApiClient();

interface StorageProvider {
    name: string;
    availableRegions: string[]
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

interface DownloadRequestResult {
    _id: string;
    fileId: string;
    downloadUrl: string;
    fileSize: string;
    originalName: string;
}