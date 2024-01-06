import { PublicClientApplication, type Configuration, type RedirectRequest } from "@azure/msal-browser";
import { type User } from './types';
import { Logger } from './logger';

export class AuthHandler {
    private authClient: PublicClientApplication;
    private userHandler: UserHandler;

    constructor(private config: AuthClientConfig) {
        this.authClient = new PublicClientApplication(config.msalConfig);
        this.userHandler = config.userHandler
    }

    async signIn(): Promise<void> {
        return this.makeSignInRequest();
    }

    async signInWithInvite(inviteId: string): Promise<void> {
        this.clearLocalSession();
        return this.makeSignInRequest({
            // setting 'login' as the prompt forces the user to manually login even if there's already an active session on this app
            // see: https://azuread.github.io/microsoft-authentication-library-for-js/ref/types/_azure_msal_browser.RedirectRequest.html
            prompt: 'login',
            state: JSON.stringify({ invite: inviteId }),
            extraQueryParameters: { invite: inviteId },
        });
    }

    private async makeSignInRequest(request?: Partial<RedirectRequest>) {
        /**
         * You can pass a custom request object below. This will override the initial configuration. For more information, visit:
         * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/request-response-object.md#request
         */
        const loginRequest: RedirectRequest = {
            ...request,
            scopes: this.config.scopes
        };

        return this.authClient.loginRedirect(loginRequest);
    }

    async signOut(): Promise<void> {
        /**
         * You can pass a custom request object below. This will override the initial configuration. For more information, visit:
         * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/request-response-object.md#request
         */

        const currentUser = this.userHandler.getUser();
        // Choose which account to logout from by passing a username.
        const account = this.authClient.getAccountByUsername(currentUser?.email || "");
        const logoutRequest = {
            account: account,
            // postLogoutRedirectUri: '/signout', // remove this line if you would like navigate to index page after logout.
        };

        const result = this.config.onSignOut && this.config.onSignOut();
        if (result instanceof Promise) {
            await result;
        }

        await this.authClient.logoutRedirect(logoutRequest);
    }

    async getToken(): Promise<string> {
        const currentAccounts = this.authClient.getAllAccounts();
        if (currentAccounts.length) {
            this.authClient.setActiveAccount(currentAccounts[0]);
        }

        const result = await this.authClient.acquireTokenSilent({
            scopes: this.config.scopes
        });

        return result.accessToken;
    }

    async handleRedirect(): Promise<void> {
        await this.authClient.handleRedirectPromise();
        this.selectAccount();
    }

    selectAccount () {

        /**
         * See here for more info on account retrieval: 
         * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/Accounts.md
         */
    
        const currentAccounts = this.authClient.getAllAccounts();
    
        if (!currentAccounts  || currentAccounts.length < 1) {
            return;
        } else if (currentAccounts.length >= 1) {
            if (currentAccounts.length > 1) {
                // Add your account choosing logic here
                this.config.logger?.log('Multiple accounts detected', 'warning');
            }
            console.log('accounts', currentAccounts);
            const account = currentAccounts[0];

            this.userHandler.setUser({
                aadId: account.localAccountId,
                name: account.name || account.username,
                email: account.username
            });
        }
    }

    /**
     * Clears auth information from local cache
     * without sending a logout request to the auth server.
     * This is useful when we want to force the user to login even
     * if there's a currently logged-in user and there's a chance
     * the user that will login will be different from the current user.
     * In essence, this is used to avoid the potential of having two
     * simultaneously logged-in accounts since our app currently
     * does not support switching between multiple active accounts.
     */
    private clearLocalSession() {
        // This is a hack. We resort
        // to removing data from local storage manually
        // since the MSAL client does not expose
        // an API for clearing the local cache.
        // localStorage.clear();

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('msal') || key.includes('ciamlogin') || key.includes('server-telemetry'))) {
                localStorage.removeItem(key);
            }
        }
    }
}

export interface AuthClientConfig {
    msalConfig: Configuration;
    userHandler: UserHandler;
    scopes: string[];
    onSignOut?: () => unknown;
    logger?: Logger;
}

interface UserHandler {
    getUser: () => User|undefined;
    setUser: (user: User) => void;
}