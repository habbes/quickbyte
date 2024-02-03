import { LogLevel } from "@azure/msal-browser";
import { AuthHandler } from '@/core';
import { clearData } from './store';
import { logger } from './logger';
import { router } from '../router';
import { trpcClient } from ".";

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
                        logger.debug(message);
                        return;
                    case LogLevel.Verbose:
                        logger.debug(message);
                        return;
                    case LogLevel.Warning:
                        logger.warn(message);
                        return;
                }
            },
            logLevel: LogLevel.Warning
        },
    },
};

export const auth = new AuthHandler({
    onSignOut: () => {
        clearData();
    },
    apiClient: trpcClient,
    router: router
});
