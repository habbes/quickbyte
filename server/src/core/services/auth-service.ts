import { Collection, } from "mongodb";
import msal, { ConfidentialClientApplication, ICachePlugin } from "@azure/msal-node";
import jwt, { GetPublicKeyOrSecret } from "jsonwebtoken";
import createJwksClient, { JwksClient } from "jwks-rsa";
import { createAppError, createAuthError, createDbError, createInvalidAppStateError, createResourceConflictError, createResourceNotFoundError, isAppError, isMongoDuplicateKeyError, rethrowIfAppError } from "../error.js";
import { createPersistedModel, FullUser, User, UserWithAccount, GuestUser } from "../models.js";
import { AcceptInviteArgs, Resource, CheckUserAuthMethodArgs, UserAuthMethodResult } from "@quickbyte/common";
import { IAccountService } from "./account-service.js";
import { EmailHandler, IAlertService, createInviteAcceptedEmail, createWelcomeEmail } from "./index.js";
import { IInviteService } from "./invite-service.js";
import { IAccessHandler } from "./access-handler.js";
import { Database } from "../db.js";

// We use AAD on-behalf-of flow for authentication:
// https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-node-samples/on-behalf-of

// TODO: this class is a hack and should be replaced with a distributed cache
class MemoryCachePlugin implements ICachePlugin {
    private serializedCache: string = "";

    beforeCacheAccess(tokenCacheContext: msal.TokenCacheContext): Promise<void> {
        if (this.serializedCache) {
            tokenCacheContext.tokenCache.deserialize(this.serializedCache);
        }
        else {
            this.serializedCache = tokenCacheContext.tokenCache.serialize();
        }

        console.log('before cache access', this.serializedCache);

        return Promise.resolve();
    }

    afterCacheAccess(tokenCacheContext: msal.TokenCacheContext): Promise<void> {
        if (tokenCacheContext.cacheHasChanged) {
            this.serializedCache = tokenCacheContext.tokenCache.serialize();
        }

        console.log('after cache access', this.serializedCache);

        return Promise.resolve();
    }
}

const tokenCachePlugin = new MemoryCachePlugin();

export class AuthService {
    private authConfig: AuthConfig;
    private jwksClient: JwksClient;
    private msalClient: ConfidentialClientApplication;
    private usersCollection: Collection<User>;

    constructor(private db: Database, private args: AuthServiceArgs) {
        this.authConfig = {
            authOptions: {
                clientId: this.args.aadClientId,
                authority: `https://login.microsoftonline.com/${this.args.aadTenantId}`,
                clientSecret: this.args.aadClientSecret
            },
            webApiScope: `api://${this.args.aadClientId}/access_as_user openid offline_access`,
            discoveryKeysEndpoint: `https://login.microsoftonline.com/${this.args.aadTenantId}/discovery/v2.0/keys`
        };

        this.jwksClient = createJwksClient({
            jwksUri: this.authConfig.discoveryKeysEndpoint
        });

        this.msalClient = new ConfidentialClientApplication({
            auth: this.authConfig.authOptions,
            system: {
                loggerOptions: {
                    loggerCallback(loglevel, message, containsPii) {
                        console.log(message);
                    },
                    piiLoggingEnabled: false,
                    logLevel: msal.LogLevel.Info,
                }
            },
            cache: { cachePlugin: tokenCachePlugin }
        });

        this.usersCollection = this.db.users();
    }

    async getAuthMethod(args: CheckUserAuthMethodArgs): Promise<UserAuthMethodResult> {
        try {
            console.log('here', args);
            const user = await this.usersCollection.findOne({ email: args.email });
            if (user) {
                return {
                    exists: true,
                    provider: 'email'
                }
            };

            return {
                exists: false,
            }
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    /**
     * Verifies whether the specified auth token is valid.
     * Throws an authentication error if the token cannot be validated.
     * @param token 
     */
    async verifyToken(token: string): Promise<void> {
        const validationOptions = {
            audience: `api://${this.args.aadClientId}`,
            // issuer: `${this.authConfig.authOptions.authority}/v2.0`
        };

        const getSigningKey: GetPublicKeyOrSecret = (header, callback) => {
            this.jwksClient.getSigningKey(header.kid, (err, result) => {
                callback(err, result?.getPublicKey())
            });
        }

        await new Promise<void>((resolve, reject) => {
            jwt.verify(token, getSigningKey, validationOptions, (err, payload) => {
                if (err) {
                    if (isAppError(err)) {
                        reject(err);
                        return;
                    }

                    reject(createAuthError(err));
                    return;
                }

                resolve();
            })
        });
    }

    async getUserByToken(token: string): Promise<UserWithAccount> {
        const parsed = jwt.decode(token, { complete: true });
        if (!parsed) {
            throw createAuthError("Invalid token");
        }

        if (typeof parsed.payload === 'string') {
            throw createAuthError("Invalid token");
        }

        const user = await this.getOrCreateUser(parsed.payload);
        const account = await this.args.accounts.getOrCreateByOwner(user._id);

        const userWithAccount: UserWithAccount = { ...user, account: { ...account, name: `${user.name}'s Account` } }

        const sub = await this.args.accounts.transactions({ user: userWithAccount }).tryGetActiveOrPendingSubscription();
        if (sub) {
            userWithAccount.account.subscription = sub;
        }

        return userWithAccount;
    }

    async verifyTokenAndGetUser(token: string): Promise<UserWithAccount> {
        await this.verifyToken(token);
        const user = await this.getUserByToken(token);
        return user;
    }

    async getUserById(id: string): Promise<UserWithAccount> {
        try {
            const user = await this.usersCollection.findOne({ _id: id });
            if (!user || user.isGuest) {
                throw createResourceNotFoundError('User not found.');
            }

            const account = await this.args.accounts.getOrCreateByOwner(user._id);
            return { ...user, account };
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async acceptUserInvite(args: AcceptInviteArgs): Promise<Resource> {
        try {
            const invite = await this.args.invites.verifyInvite(args.code);
            // check if user already exists
            let user = await this.usersCollection.findOne({ email: args.email })

            if (!user) {
                // user does not exist, let's create a guest user
                const newUser: GuestUser = {
                    ...createPersistedModel({ _id: 'system', type: 'system' }),
                    email: args.email,
                    name: args.name,
                    invitedBy: invite._createdBy,
                    isGuest: true
                };

                await this.usersCollection.insertOne(newUser);
                user = newUser;
            }

            const role = await this.args.access.assignRole(invite._createdBy, user._id, invite.resource.type, invite.resource.id, invite.role);
            await this.args.invites.deleteInvite(invite._id);

            const invitor = await this.usersCollection.findOne({ _id: invite._createdBy._id });
            if (!invitor) {
                throw createInvalidAppStateError(`Expected invitor creator '${invite._createdBy._id}' to exist but was not found`);
            }

            // TODO: email should happen in background
            await this.args.email.sendEmail({
                to: {
                    name: invitor.name,
                    email: invitor.email
                },
                subject: `${user.name} accepted your invitation to join ${invite.resource.name}`,
                message: createInviteAcceptedEmail(invitor.name, user.name, invite)
            });

            if (invite.resource.type === 'project') {
                
                const project = await this.db.projects().findOne({ _id: invite.resource.id });
                if (!project) {
                    throw createInvalidAppStateError(`Expected project '${invite.resource.id}' to exist for resource of invite '${invite._id}' but was not found.`);
                }

                const resource = { ...invite.resource, object: { ...project, role: role.role } }
                return resource;
            } else {
                throw createInvalidAppStateError(`Resource of type '${invite.resource.type}' for invite '${invite._id}' not handled.`);
            }
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async verifyInvite(inviteCode: string) {
        const invite = await this.args.invites.verifyInvite(inviteCode);
        return invite;
    }

    async declineUserInvite(id: string, email: string): Promise<void> {
        try {
            await this.args.invites.declineInvite(id, email);
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    private async getOrCreateUser(data: jwt.JwtPayload): Promise<FullUser> {
        const email: string = getEmailFromJwt(data);
        const aadId: string = data.oid;
        const name: string = data.name;

        try {
            const existingUser = await this.usersCollection.findOne({ email: email, aadId: aadId });
            if (existingUser && !existingUser.isGuest) {
                return existingUser;
            }

            if (existingUser && existingUser.isGuest) {
                throw createAppError('Upgrading guest to full user not yet supported.');
            }

            const newUser: User = {
                ...createPersistedModel({ type: 'system', _id: 'system' }),
                email,
                aadId,
                name: name || email
            };

            await this.usersCollection.insertOne(newUser);
            await this.args.accounts.getOrCreateByOwner(newUser._id);

            // we don't want to fail operation due to an email failure
            // so we don't await it
            this.args.email.sendEmail({
                to: { email: newUser.email, name: newUser.name },
                subject: 'Welcome to Quickbyte!',
                message: createWelcomeEmail(newUser.name, this.args.webappBaseUrl)
            }).catch(e => {
                console.error(`Error sending welcome email`, e);
            });

            this.args.adminAlerts.sendNotification(
                'New user',
                `New user signed up:<br>Name: ${newUser.name}<br>Email: ${newUser.email}`
            ).catch(e => {
                console.error('Failed to send new user alert', e);
            });

            return newUser;
        }
        catch (e: any) {
            if (isMongoDuplicateKeyError(e)) {
                throw createResourceConflictError(e);
            }

            throw createDbError(e);
        }
    }

}

export type IAuthService = Pick<AuthService, 'getUserByToken' | 'verifyToken' | 'verifyTokenAndGetUser' | 'getUserById' | 'acceptUserInvite' | 'declineUserInvite' | 'verifyInvite'|'getAuthMethod'>;

function getEmailFromJwt(jwtPayload: Record<string, string>): string {
    if (jwtPayload.email) {
        return jwtPayload.email;
    }

    const uniqueName = jwtPayload.unique_name;
    if (uniqueName.includes('#')) {
        // when using an external provider like Google,
        // the uniqueName is of the format google#actualemail@gmail.com
        const email = uniqueName.split('#')[1];
        if (email) {
            return email;
        }
    }

    return uniqueName;
}

export interface AuthServiceArgs {
    aadClientId: string;
    aadClientSecret: string;
    aadTenantId: string;
    accounts: IAccountService;
    email: EmailHandler;
    adminAlerts: IAlertService;
    invites: IInviteService;
    webappBaseUrl: string;
    access: IAccessHandler;
}

interface AuthConfig {
    authOptions: {
        clientId: string;
        authority: string;
        clientSecret: string;
    },
    webApiScope: string;
    discoveryKeysEndpoint: string;
}
