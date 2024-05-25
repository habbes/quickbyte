import { Db, Filter, MongoClient } from 'mongodb';
import { Account, Project, Comment, UserInvite, UserRole, Subscription, Transaction, TransferFile, DbTransfer, DownloadRequest, UserVerification, UserInDb, AuthToken, Folder, Deleteable, ParentDeleteable, Principal, PersistedModel, ProjectShare, MediaVersion } from '../models.js';
import { Media } from '../models.js';

export class Database {
    constructor(public readonly db: Db, private readonly client: MongoClient) {
    }

    users = () => this.db.collection<UserInDb>('users');

    roles = () => this.db.collection<UserRole>('roles');

    accounts = () => this.db.collection<DbAccount>('accounts');

    projects = () => this.db.collection<Project>('projects');

    invites = () => this.db.collection<DbUserInvite>('invites');

    subscriptions = () => this.db.collection<Subscription>('subscriptions');

    transactions = () => this.db.collection<Transaction>('transactions');

    files = () => this.db.collection<TransferFile>('files');

    transfers = () => this.db.collection<DbTransfer>('transfers');

    downloads = () => this.db.collection<DownloadRequest>('downloads');

    userVerifications = () => this.db.collection<UserVerification>('user_verifications');

    authTokens = () => this.db.collection<AuthToken>('auth_tokens');

    comments = () => this.db.collection<Comment>('comments');

    media = () => this.db.collection<DbMedia>("media");

    folders = () => this.db.collection<Folder>("folders");

    projectShares = () => this.db.collection<DbProjectShare>("project_shares");

    async initialize() {
        await this.users().createIndex('email', { unique: true });

        await this.authTokens().createIndex('code', { unique: true });

        await this.folders().createIndex("parentId", { partialFilterExpression: { parentId: { $exists: true } } });
        
        await this.folders().createIndex({ projectId: 1 });
        await this.folders().createIndex({ projectId: 1, parentId: 1 });
        await this.folders().createIndex({ projectId: 1, name: 1 });
        await this.folders().createIndex(
            { projectId: 1, name: 1, parentId: 1 },
            { 
                name: 'unique_folder_name_in_parent',
                unique: true,
                partialFilterExpression: { deletedBy: { $eq: null }, parentDeleted: { $eq: null } }
            }
        );
        
        await this.media().createIndex("folderId", { partialFilterExpression: { folderId: { $exists: true } } });
    }

    startSession() {
        return this.client.startSession();
    }
}

// TODO: this is temporary, until we add names to accounts
export type DbAccount = Omit<Account, 'name'>;


// secret code is not exposed to API but send to
// the invite recipient by email and used to authenticate
// the invite
export type DbUserInvite = UserInvite & { secret: string };

export interface DbProjectShare extends ProjectShare {
    password?: string;
}

export interface DbMedia extends Media {
    // We store deleted versions to implement "soft deletes",
    // We store them in a separate field instead of keeping them
    // in the versions array marked as deleted because we may
    // easily forget to filter out deleted versions with $elemMatch
    // projections and end up leaking deleted versions to the UI
    _deletedVersions?: MediaVersion[];
}

export function createFilterForDeleteableResource<T extends Deleteable | ParentDeleteable>(filter: Filter<T>): Filter<T> {
    return { ...filter, deleted: { $ne: true }, parentDeleted: { $ne: true } };
}

export function updateNowBy(principal: string | Principal): Pick<PersistedModel, '_updatedAt'|'_updatedBy'> {
    const _updatedBy: Principal = typeof principal === 'string' ? { _id: principal, type : 'user' } : principal;
    return {
        _updatedAt: new Date(),
        _updatedBy
    }
}

export function deleteNowBy(principal: string | Principal): Deleteable {
    const deletedBy: Principal = typeof principal === 'string' ? { _id: principal, type : 'user' } : principal;
    return {
        deleted: true,
        deletedAt: new Date(),
        deletedBy
    };
}

export function getSafeProjectShare<T extends DbProjectShare>(dbShare: T): Omit<T, 'password'> {
    const share = { ...dbShare };
    delete share.password;
    return share;
}

export function getSafeMedia<T extends DbMedia>(dbMedia: T): Omit<T, '_deletedVersions'> {
    const media = { ...dbMedia };
    delete media._deletedVersions;
    return media;
}