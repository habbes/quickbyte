import { Db, Collection, } from "mongodb";
import msal, { ConfidentialClientApplication, ICachePlugin } from "@azure/msal-node";
import axios from "axios";
import jwt, { GetPublicKeyOrSecret } from "jsonwebtoken";
import createJwksClient, { JwksClient } from "jwks-rsa";
import { createAppError, createAuthError, createDbError, createResourceConflictError, createResourceNotFoundError, isAppError, isMongoDuplicateKeyError, rethrowIfAppError } from "../error.js";
import { createPersistedModel, FullUser, User, UserWithAccount, GuestUser, UserRole, ResourceType, Principal, RoleType } from "../models.js";
import { IAccountService } from "./account-service.js";
import { EmailHandler, IAlertService, createWelcomeEmail } from "./index.js";
import { IInviteService } from "./invite-service.js";

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

const COLLECTION = "users";
const ROLES_COLLECTION = "users_roles";

export class AuthService {
    private authConfig: AuthConfig;
    private jwksClient: JwksClient;
    private msalClient: ConfidentialClientApplication;
    private usersCollection: Collection<User>;
    private rolesCollection: Collection<UserRole>;

    constructor(private db: Db, private args: AuthServiceArgs) {
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

        this.usersCollection = this.db.collection<User>(COLLECTION);
        this.rolesCollection = this.db.collection<UserRole>(ROLES_COLLECTION);
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

        const userWithAccount: UserWithAccount = { ...user, account }

        const sub = await this.args.accounts.transactions({ user: userWithAccount }).tryGetActiveOrPendingSubscription();
        if (sub) {
            userWithAccount.account.subscription = sub;
        }

        return userWithAccount ;
    }

    async getUserById(id: string): Promise<UserWithAccount> {
        try {
            const user = await this.usersCollection.findOne({ _id: id });
            if (!user || user.isGuest) {
                throw createResourceNotFoundError('User not found.');
            }

            const account = await this.args.accounts.getOrCreateByOwner(user._id);
            return { ...user, account};
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async acceptUserInvite(id: string, args: AcceptInviteArgs): Promise<User>  {
        try {
            const invite = await this.args.invites.verifyInvite(id, args.email);
            // check if user already exists
            let user = await this.usersCollection.findOne({ email: args.email });
    
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

            // TODO: should we embed roles in the user record? How do we ensure we don't store "duplicate" roles?
            await this.setRole(user._id, invite.resource.type, invite.resource.id, 'reviewer', invite._createdBy);

            // TODO: send email notifications
            // TODO: add roles field to user object
            return user;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    private async setRole(userId: string, resourceType: ResourceType, resourceId: string, role: RoleType, setBy: Principal): Promise<UserRole> {
        try {
            
            const existingRole = await this.rolesCollection.findOne({
                userId,
                resourceType,
                resourceId,
            });

            if (existingRole) {
                const update = await this.rolesCollection.findOneAndUpdate({ _id: existingRole._id }, {
                    $set: {
                        updatedAt: new Date(),
                        updatedBy: setBy,
                        role: role
                    }
                }, {
                    returnDocument: 'after'
                });

                if (!update.value) {
                    throw createAppError(`Failed to update role: '${existingRole._id}': ${update.lastErrorObject}`);
                }

                return update.value;
            } else {
                const newRole: UserRole = {
                    ...createPersistedModel(setBy),
                    userId,
                    resourceType,
                    resourceId,
                    role
                };
                
                await this.rolesCollection.insertOne(newRole);

                return newRole;
            }
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    private async getUserByToken_Broken(token: string): Promise<any> {
        
        // on-behalf-of request
        console.log('token', token);
        try {
            const oboRequest = {
                oboAssertion: token,
                scopes: ["user.read"]
            };

            // TODO: this method throws the following error
            // not sure why
            // AADSTS500208: The domain is not a valid login domain for the account type.
            const oboToken = await this.msalClient.acquireTokenOnBehalfOf(oboRequest);
            console.log('OBO token', oboToken);
            const url = "https://graph.microsoft.com/v1.0/me";
            const result = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${oboToken}`
                }
            });

            return result.data;
        } catch (e: any) {
            console.log('e', e)
            if (e.response?.status && e.response.status == 401) {
                if (e.response?.data?.error?.message) {
                    throw createAuthError(e.response.data.error.message);
                }

                throw createAuthError(e.message);
            }

            if (e.response?.data?.error?.message) {
                throw createAppError(e.response.data.error.message);
            }

            throw createAppError(e.message);
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

export type IAuthService = Pick<AuthService, 'getUserByToken' | 'verifyToken' |'getUserById'|'acceptUserInvite'>;

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

export interface AcceptInviteArgs {
    name: string;
    email: string;
}