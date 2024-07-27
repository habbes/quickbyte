import { LogLevel } from "@azure/msal-browser";
import { AuthHandler, unwrapSingleton } from '@/core';
import { clearData } from './store';
import { logger } from './logger';
import { router } from '../router';
import { trpcClient } from ".";
import type { Router } from "vue-router";

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

/**
 * Redirects to the login page with the current route set
 * as next path. This is useful when the user navigates
 * to a page that requires authentication without
 * being logged in.
 * @param router 
 */
export function redirectToLoginWithNextPath(router: Router) {
    const nextPath = router.currentRoute.value?.path;
    const currentQuery = router.currentRoute.value?.query || {};

    const queryParams = new URLSearchParams();
    for (const [key, rawValue] of Object.entries(currentQuery)) {
        const value = unwrapSingleton(rawValue)
        if (value !== null) {
            queryParams.set(key, value);
        }
    }

    const fullNextPath = queryParams.size > 0 ? `${nextPath}?${queryParams.toString()}` : nextPath;
    // vue-router does not seem to handle URL encode/decode for query params
    const encodedNextPath = encodeURIComponent(fullNextPath);
    router.push({ name: 'login', query: { next: encodedNextPath } });
}