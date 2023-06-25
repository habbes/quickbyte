import { LogLevel, PublicClientApplication } from "@azure/msal-browser";
import { ref } from "vue";

const user = ref<User|undefined>();

/**
 * Configuration object to be passed to MSAL instance on creation. 
 * For a full list of MSAL.js configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md 
 */
export const msalConfig = {
    auth: {
        clientId: 'e59f0dbb-066d-448e-8420-711b83a71710', // This is the ONLY mandatory field that you need to supply.
        authority: 'https://TrialTenantlDF1TAkb.ciamlogin.com/', // Replace the placeholder with your tenant subdomain
        redirectUri: '/', // You must register this URI on Azure Portal/App Registration. Defaults to window.location.href e.g. http://localhost:3000/
        navigateToLoginRequestUrl: true, // If "true", will navigate back to the original request location before processing the auth code response.
    },
    cache: {
        cacheLocation: 'sessionStorage', // Configures cache location. "sessionStorage" is more secure, but "localStorage" gives you SSO.
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
                        console.error(message);
                        return;
                    case LogLevel.Info:
                        console.info(message);
                        return;
                    case LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
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
export const loginRequest = {
    scopes: ["api://c84523c3-c74d-4174-a87d-cce9d81bd0a3/.default", "openid", "offline_access"],
};

export const msalObj = new PublicClientApplication(msalConfig);

msalObj.handleRedirectPromise()
    .then(authResponse => {
        const accessToken = authResponse?.accessToken;
        if (accessToken) {
            localStorage.setItem("accessToken", accessToken);
        }
        selectAccount();
    })
    .catch((error) => {
        console.error(error);
    });

export async function signIn() {

    /**
     * You can pass a custom request object below. This will override the initial configuration. For more information, visit:
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/request-response-object.md#request
     */

    try {
        // const authResponse = await msalObj.loginPopup(loginRequest);
        // console.log('done');
        // console.log('loginResp', authResponse);
        // selectAccount();
        await msalObj.loginRedirect(loginRequest);
    } catch (e) {
        console.error(e);
    }
}


function selectAccount () {

    /**
     * See here for more info on account retrieval: 
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/Accounts.md
     */

    const currentAccounts = msalObj.getAllAccounts();

    if (!currentAccounts  || currentAccounts.length < 1) {
        return;
    } else if (currentAccounts.length > 1) {
        // Add your account choosing logic here
        console.warn("Multiple accounts detected.");
    } else if (currentAccounts.length === 1) {
        user.value = {
            aadId: currentAccounts[0].localAccountId,
            name: currentAccounts[0].name || "unknown",
            email: currentAccounts[0].username
        };
        
    }
}

export function signOut() {

    /**
     * You can pass a custom request object below. This will override the initial configuration. For more information, visit:
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/request-response-object.md#request
     */

    // Choose which account to logout from by passing a username.
    const logoutRequest = {
        account: msalObj.getAccountByUsername(user.value?.email || ""),
        // postLogoutRedirectUri: '/signout', // remove this line if you would like navigate to index page after logout.
    };

    localStorage.removeItem("accessToken");

    msalObj.logoutRedirect(logoutRequest);
}

selectAccount();

export async function getToken(): Promise<string> {
    const currentAccounts = msalObj.getAllAccounts();
    if (currentAccounts.length) {
        msalObj.setActiveAccount(currentAccounts[0]);
    }
    const result = await msalObj.acquireTokenSilent(loginRequest);
    return result.accessToken;
}

interface User {
    aadId: string;
    name: string;
    email: string;
}

export function useUser() {
    return user;
}