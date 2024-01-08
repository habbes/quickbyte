import { Db } from 'mongodb';
import { Account, Project, User, UserInvite, UserRole } from './models.js';


export class Database {
    constructor(public readonly db: Db) {
    }

    users = () => this.db.collection<User>('users');

    roles = () => this.db.collection<UserRole>('roles');

    accounts = () => this.db.collection<DbAccount>('accounts');

    projects = () => this.db.collection<Project>('projects');

    invites = () => this.db.collection<UserInvite>('invites');
}

// TODO: this is temporary, until we add names to accounts
export type DbAccount = Omit<Account, 'name'>;