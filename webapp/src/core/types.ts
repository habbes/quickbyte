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
    }
}

export interface StorageProvider {
    name: string;
    availableRegions: RegionInfo[]
}