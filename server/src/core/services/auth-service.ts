import { Db, Collection, } from "mongodb";
import msal, { ConfidentialClientApplication, ICachePlugin } from "@azure/msal-node";
import axios from "axios";
import jwt, { GetPublicKeyOrSecret } from "jsonwebtoken";
import createJwksClient, { JwksClient } from "jwks-rsa";
import { createAppError, createAuthError, createDbError, createResourceConflictError, isAppError, isMongoDuplicateKeyError } from "../error.js";
import { createPersistedModel, User, UserWithAccount } from "../models.js";
import { IAccountService } from "./account-service.js";

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

export class AuthService {
    private authConfig: AuthConfig;
    private jwksClient: JwksClient;
    private msalClient: ConfidentialClientApplication;
    private usersCollection: Collection<User>;

    constructor(private db: Db, private args: AuthServiceArgs) {
        this.authConfig = {
            authOptions: {
                clientId: this.args.aadClientId,
                authority: `https://login.microsoftonline.com/${this.args.aadTenantId}`,
                clientSecret: this.args.aadClientSecret
            },
            webApiScope: "api://c84523c3-c74d-4174-a87d-cce9d81bd0a3/access_as_user openid offline_access",
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

        const sub = await this.args.accounts.transactions({ user: userWithAccount }).tryGetActiveSubscription();
        if (sub) {
            userWithAccount.account.subscription = sub;
        }

        return userWithAccount ;
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

    private async getOrCreateUser(data: jwt.JwtPayload) {
        const email: string = data.unique_name;
        const aadId: string = data.oid;
        const name: string = data.name;

        try {
            const existingUser = await this.usersCollection.findOne({ email: email, aadId: aadId });
            if (existingUser) {
                return existingUser;
            }

            const newUser: User = {
                ...createPersistedModel({ type: 'system', _id: 'system' }),
                email,
                aadId,
                name: name || email
            };

            await this.usersCollection.insertOne(newUser);
            await this.args.accounts.getOrCreateByOwner(newUser._id);
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

export type IAuthService = Pick<AuthService, 'getUserByToken' | 'verifyToken'>;

export interface AuthServiceArgs {
    aadClientId: string;
    aadClientSecret: string;
    aadTenantId: string;
    accounts: IAccountService;
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
