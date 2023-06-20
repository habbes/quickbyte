
export interface PersistedModel {
    _id: string;
    _createdAt: Date;
    _updatedAt: Date;
    _createdBy: Principal;
    _updatedBy: Principal;
}

export interface Principal {
    type: 'user',
    _id: string;
}

export interface Account extends PersistedModel {
    owner: Principal;
}

export interface User extends PersistedModel {
    email: string;
    name: string;
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