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
} | {
    type: 'system',
    _id: 'system'
}

export interface Account extends PersistedModel {
    owner: Principal;
}

export interface User extends PersistedModel {
    email: string;
    name: string;
    aadId: string;
}

export interface UserWithAccount extends User {
    account: Account
};

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
}

export interface Upload extends PersistedModel {
    fileId: string;
    blockSize: number;
    blocksCompleted: number;
}

export interface Download extends PersistedModel {
    fileId: string;
    accountId: string;
    numRequests: number;
    fileSize: number;
    provider: string;
    region: string;
    originalName: string;
    downloadUrl: string;
    expiryDate: Date;
}
