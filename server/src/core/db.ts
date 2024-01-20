import { Db } from 'mongodb';
import { Account, Project, User, UserInvite, UserRole, Subscription, Transaction, TransferFile, DbTransfer, DownloadRequest } from './models.js';


export class Database {
    constructor(public readonly db: Db) {
    }

    users = () => this.db.collection<User>('users');

    roles = () => this.db.collection<UserRole>('roles');

    accounts = () => this.db.collection<DbAccount>('accounts');

    projects = () => this.db.collection<Project>('projects');

    invites = () => this.db.collection<DbUserInvite>('invites');

    subscriptions = () => this.db.collection<Subscription>('subscriptions');

    transactions = () => this.db.collection<Transaction>('transactions');

    files = () => this.db.collection<TransferFile>('files');

    transfers = () => this.db.collection<DbTransfer>('transfers');

    downloads = () => this.db.collection<DownloadRequest>('downloads');
}

// TODO: this is temporary, until we add names to accounts
export type DbAccount = Omit<Account, 'name'>;


// secret code is not exposed to API but send to
// the invite recipient by email and used to authenticate
// the invite
export type DbUserInvite = UserInvite & { secret: string };