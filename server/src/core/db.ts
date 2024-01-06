import { Db, Collection } from 'mongodb';
import { Account, Project, User, UserRole } from './models.js';


export class Database {
    constructor(public readonly db: Db) {
    }

    users = () => this.db.collection<User>('users');

    roles = () => this.db.collection<UserRole>('roles');

    accounts = () => this.db.collection<Account>('accounts');

    projects = () => this.db.collection<Project>('projects');
}