import { LogLevel } from "@azure/msal-browser";
import { ref } from "vue";
import { AuthHandler, type User } from '@/core';
import { clearData } from './store';
import { logger } from './logger';

const user = ref<User|undefined>();

/**
 * Configuration object to be passed to MSAL instance on creation. 
 * For a full list of MSAL.js configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md 
 */
export const msalConfig = {
    auth: {
        clientId: import.meta.env.VITE_AAD_CLIENT_ID, // This is the ONLY mandatory field that you need to supply.
        authority: import.meta.env.VITE_AAD_AUTHORITY, // Replace the placeholder with your tenant subdomain
        redirectUri: '/', // You must register this URI on Azure Portal/App Registration. Defaults to window.location.href e.g. http://localhost:3000/
        navigateToLoginRequestUrl: true, // If "true", will navigate back to the original request location before processing the auth code response.
    },
    cache: {
        cacheLocation: 'localStorage', // Configures cache location. "sessionStorage" is more secure, but "localStorage" gives you SSO.
        storeAuthStateInCookie: false, // set this to true if you have to support IE
    },
    system: {
        loggerOptions: {
            loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case LogLevel.Error:
                        logger.error(message);
                        return;
                    case LogLevel.Info:
                        logger.info(message);
                        return;
                    case LogLevel.Verbose:
                        logger.debug(message);
                        return;
                    case LogLevel.Warning:
                        logger.warn(message);
                        return;
                }
            },
        },
    },
};

/**
 * Scopes you add here will be prompted for user consent during sign-in.
 * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
 * For more information about OIDC scopes, visit: 
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
 */
const scopes = ["api://c84523c3-c74d-4174-a87d-cce9d81bd0a3/.default", "openid", "offline_access"];

export const auth = new AuthHandler({
    msalConfig,
    userHandler: {
        getUser: () => user.value,
        setUser: authenticatedUser => user.value = authenticatedUser,
    },
    onSignOut: () => {
        clearData();
    },
    scopes,
    logger
});

export function initAuth(): Promise<void> {
    auth.selectAccount();
    return auth.handleRedirect();
}

export function useUser() {
    return user;
}