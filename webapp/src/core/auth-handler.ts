import { PublicClientApplication, type Configuration } from "@azure/msal-browser";
import { type User } from './types';

export class AuthHandler {
    private authClient: PublicClientApplication;
    private userHandler: UserHandler;

    constructor(private config: AuthClientConfig) {
        this.authClient = new PublicClientApplication(config.msalConfig);
        this.userHandler = config.userHandler
    }

    signIn(): Promise<void> {
        /**
         * You can pass a custom request object below. This will override the initial configuration. For more information, visit:
         * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/request-response-object.md#request
         */
        // const authResponse = await msalObj.loginPopup(loginRequest);
        // console.log('done');
        // console.log('loginResp', authResponse);
        // selectAccount();
        const loginRequest = {
            scopes: this.config.scopes
        };

        return this.authClient.loginRedirect(loginRequest);
    }

    signOut(): Promise<void> {
        /**
         * You can pass a custom request object below. This will override the initial configuration. For more information, visit:
         * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/request-response-object.md#request
         */

        const currentUser = this.userHandler.getUser();
        // Choose which account to logout from by passing a username.
        const logoutRequest = {
            account: this.authClient.getAccountByUsername(currentUser?.email || ""),
            // postLogoutRedirectUri: '/signout', // remove this line if you would like navigate to index page after logout.
        };

        this.config.onSignOut && this.config.onSignOut();
        return this.authClient.logoutRedirect(logoutRequest);
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
                console.warn("Multiple accounts detected.");
            }

            const account = currentAccounts[0];
            
            this.userHandler.setUser({
                aadId: account.localAccountId,
                name: account.name || account.username,
                email: account.username
            });
        }
    }
}

export interface AuthClientConfig {
    msalConfig: Configuration;
    userHandler: UserHandler;
    scopes: string[];
    onSignOut?: () => void;
}

interface UserHandler {
    getUser: () => User|undefined;
    setUser: (user: User) => void;
}