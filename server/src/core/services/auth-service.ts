import { Collection, MongoError, } from "mongodb";
import msal, { ConfidentialClientApplication, ICachePlugin } from "@azure/msal-node";
import jwt, { GetPublicKeyOrSecret } from "jsonwebtoken";
import createJwksClient, { JwksClient } from "jwks-rsa";
import { createAppError, createAuthError, createDbError, createInvalidAppStateError, createResourceConflictError, createResourceNotFoundError, createValidationError, isAppError, isMongoDuplicateKeyError, rethrowIfAppError } from "../error.js";
import { createPersistedModel, FullUser, User, UserWithAccount, GuestUser } from "../models.js";
import { AcceptInviteArgs, Resource, CheckUserAuthMethodArgs, UserAuthMethodResult, CreateUserArgs, UserVerification, UserInDb, FullUserInDb, VerifyUserEmailArgs, RequestUserVerificationEmailArgs, LoginRequestArgs, UserAndToken, AuthToken, PasswordResetArgs } from "@quickbyte/common";
import { IAccountService } from "./account-service.js";
import { EmailHandler, IAlertService, createEmailVerificationEmail, createInviteAcceptedEmail, createWelcomeEmail } from "./index.js";
import { IInviteService } from "./invite-service.js";
import { IAccessHandler } from "./access-handler.js";
import { Database } from "../db.js";
import * as bcrypt from "bcrypt";
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core'
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common'
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en'
import { randomInt, randomBytes } from 'node:crypto';


const options = {
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnEnPackage.translations,
}
zxcvbnOptions.setOptions(options)

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
    private usersCollection: Collection<UserInDb>;

    constructor(private db: Database, private args: AuthServiceArgs) {
        this.usersCollection = this.db.users();
    }

    async getAuthMethod(args: CheckUserAuthMethodArgs): Promise<UserAuthMethodResult> {
        try {
            console.log('here', args);
            const user = await this.usersCollection.findOne({ email: args.email });
            if (user && !user.isGuest) {
                // users that we created through Azure AD before we migrated to a custom
                // auth solution are considered verified
                const verified = user.verified || user.aadId ? true : false;
                return {
                    exists: true,
                    // TODO: support email provider
                    provider: 'email',
                    verified
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

    async createUser(args: CreateUserArgs): Promise<FullUser> {
        try {
            const existingUser = await this.usersCollection.findOne({ email: args.email });
            if (existingUser && existingUser.isGuest) {
                // TODO: handle guest user upgrade
                throw createAppError("Upgrading guest user to full user not yet supported");
            }

            const password = await validateAndHashPassword(args);

            let fullUser: FullUserInDb = {
                ...createPersistedModel({ type: 'system', _id: 'system'}),
                name: args.name,
                email: args.email,
                password,
                verified: false
            };

            await this.usersCollection.insertOne(fullUser);
            const user = getSafeUser(fullUser) as FullUser;

            // TODO: we're sending a welcome email, then verification email back to back.
            // Could that be confusing to the user? Should we send just one email with both?
            // Should the welcome email mention that the user should expect a verification email?
            await this.args.email.sendEmail({
                to: { name: user.name, email: user.email },
                subject: 'Welcome to Quickbyte',
                message: createWelcomeEmail(user.name, this.args.webappBaseUrl)
            });

            await this.createEmailVerification(user._id, user.email, user.name);
            return user;
        } catch (e: any) {
            if (isMongoDuplicateKeyError(e, 'email')) {
                throw createResourceConflictError("The email you entered is already taken.");
            }

            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async resetPassword(args: PasswordResetArgs) {
        try {
            const user = await this.verifyUserEmail({ code: args.code, email: args.email });
            const password = await validateAndHashPassword({
                password: args.password,
                email: args.email,
                name: user.name
            });

            const result = await this.db.users().findOneAndUpdate({
                _id: user._id
            }, {
                $set: {
                    password,
                    _updatedAt: new Date(),
                    _updatedBy: { type: 'user', _id: user._id }
                }
            });

            if (!result.ok) {
                throw createDbError(`Error updating user '${user._id}': ${result.lastErrorObject}`);
            }

            return user;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async requestUserVerificationEmail(args: RequestUserVerificationEmailArgs): Promise<void> {
        try {
            const user = await this.usersCollection.findOne({
                email: args.email
            }, {
                projection: { password: 0}
            });

            if (!user) {
                throw createResourceNotFoundError("User not found");
            }

            await this.createEmailVerification(user._id, user.email, user.name);
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async verifyUserEmail(args: VerifyUserEmailArgs): Promise<FullUser> {
        try {
            const verificationResult = await this.db.userVerifications().findOneAndDelete({
                email: args.email,
                code: args.code,
                type: 'email',
                expiresAt: { $gt: new Date() }
            });

            if (!verificationResult.value) {
                throw createAuthError("Invalid verification code");
            }

            const result = await this.db.users().findOneAndUpdate({
                _id: verificationResult.value.userId
            }, {
                $set: {
                    verified: true,
                    updatedAt: new Date(),
                    updatedBy: { type: 'system', _id: 'system' }
                }
            }, {
                returnDocument: 'after',
                projection: { password: 0 }
            });

            if (!result.value) {
                throw createInvalidAppStateError(`Expected user '${verificationResult.value.userId}' to exist after verification for email '${args.email}'.`);
            }

            return getSafeUser(result.value) as FullUser;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async login(args: LoginRequestArgs): Promise<UserAndToken> {
        try {
            const unsafeUser = await this.db.users().findOne({
                email: args.email
            });

            if (!unsafeUser) {
                throw createAuthError("Invalid email or password");
            }

            if (!('password' in unsafeUser)) {
                // This is either a guest user or an old account
                // from before we implemented in-house auth solution
                throw createAuthError("Invalid email or password");
            }

            const passwordCorrect = await verifyPassword(args.password, unsafeUser.password);
            if (!passwordCorrect) {
                throw createAuthError("Invalid email or password");
            }

            const user = getSafeUser(unsafeUser) as FullUser;

            if (!user.verified) {
                // We currently don't allow users to access the app without verifying their email
                await this.createEmailVerification(user._id, user.email, user.name);
                return { user };
            }

            const authToken = await this.createAuthToken(user._id, args);

            const userWithAccount = await this.getUserAccountAndSub(user);

            return {
                authToken,
                user: userWithAccount
            };
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async logoutToken(code: string): Promise<void> {
        try {
            await this.db.authTokens().deleteOne({ code });
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getUserByToken(code: string): Promise<UserWithAccount> {
        try {
            const token = await this.db.authTokens().findOne({
                code,
                expiresAt: { $gt: new Date() }
            });

            if (!token) {
                throw createAuthError("Invalid token. Please login again.");
            }

            const user = await this.db.users().findOne({ _id: token.userId }, { projection: { password: 0 } });
            if (!user) {
                throw createInvalidAppStateError(`Expected user '${token.userId}' to exist for token '${token._id}'.`);
            }

            if (user.isGuest) {
                throw createInvalidAppStateError(`Did not expect user '${user._id}' to be guest when acquired token '${token._id}'`);
            }

            const userWithAccount = await this.getUserAccountAndSub(user);
            return userWithAccount;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
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

    private async getUserAccountAndSub(user: FullUser): Promise<UserWithAccount> {
        try {
            const account = await this.args.accounts.getOrCreateByOwner(user._id);
            const userWithAccount: UserWithAccount = { ...user, account: { ...account, name: `${user.name}'s Account` } }

            const sub = await this.args.accounts.transactions({ user: userWithAccount }).tryGetActiveOrPendingSubscription();
            if (sub) {
                userWithAccount.account.subscription = sub;
            }
            return userWithAccount;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    private async createAuthToken(userId: string, args: LoginRequestArgs) {
        try {
            const code = generateAuthTokenCode();
            const validity = 7 * 60 * 60 * 1000; // 7 days
            const token: AuthToken = {
                ...createPersistedModel({ type: 'user', _id: userId }),
                code,
                userId,
                ip: args.ip,
                userAgent: args.userAgent,
                countryCode: args.countryCode,
                expiresAt: new Date(Date.now() + validity)
            };

            await this.db.authTokens().insertOne(token);

            return token;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    private async createEmailVerification(userId: string, email: string, name?: string) {
        
        try {
            const code = generateVerificationCode();
            const validity = 60 * 60 * 1000; // 1hr
            const expiresAt = new Date(Date.now() + validity);

            const verification: UserVerification = {
                ...createPersistedModel({ type: 'system', _id: 'system' }),
                code,
                userId,
                type: 'email',
                email,
                expiresAt
            };

            // we allow more than one active verification per user.
            // since we only need an email to request verification,
            // an attacker who knows the email can send repeated
            // verifications, invalidating previous ones, making it
            // impossible for the account owner to validate a verification code
            await this.db.userVerifications().insertOne(verification);

            await this.args.email.sendEmail({
                to: { email, name },
                subject: `Here's your verification code ${code}`,
                message: createEmailVerificationEmail({ code })
            })
            return verification;
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type IAuthService = Pick<AuthService, 'getUserByToken' | 'getUserById' | 'acceptUserInvite' | 'declineUserInvite' | 'verifyInvite'|'getAuthMethod'|'createUser'|'verifyUserEmail'|'requestUserVerificationEmail'|'login'|'logoutToken'|'resetPassword'>;

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

function getSafeUser(user: UserInDb): User {
    if ('password' in user) {
        const safeUser = { ...user };
        // @ts-ignore
        delete safeUser.password;
        return safeUser;
    }

    return user;
}

function hashPassword(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, 10);
}

function verifyPassword(plaintext: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hashed);
}

function checkPasswordStrength(password: string, args: CreateUserArgs) {
    const result = zxcvbn(password, [args.email, args.name]);
    const isStrong = result.score >= 3;
    const feedback = result.feedback;
    return {
        isStrong,
        feedback
    };
}

async function validateAndHashPassword(args: CreateUserArgs): Promise<string> {
    const passwordStrengh = checkPasswordStrength(args.password, args);
    if (!passwordStrengh.isStrong) {
        if (passwordStrengh.feedback.warning) {
            throw createValidationError(`You entered a weak password: ${passwordStrengh.feedback.warning}`);
        }

        throw createValidationError("You entered a weak password");
    }

    const password = await hashPassword(args.password);
    return password;
}

function generateVerificationCode(): string {
    const result = [];
    const length = 6;
    for (let i = 0; i < length; i++)
    {
        result.push(randomInt(0, 10));
    }
    
    return result.join('');
}

function generateAuthTokenCode(): string {
    return randomBytes(2048).toString('base64');
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
