import { Logger } from './logger';
import type { Router } from "vue-router";
import type { TrpcApiClient } from ".";
import type { AuthToken } from '@quickbyte/common';
import { computed, ref } from 'vue';
import { getGapi } from '@/app-utils';

// full token object
const TOKEN_OBJECT_STORAGE_KEY = "authToken";
// token code
const TOKEN_CODE_STORAGE_KEY = "accessToken";


export class AuthHandler {
    private authenticated =  ref<boolean>(false);
    constructor(private config: AuthClientConfig) {
    }

    async signIn(nextUrl?: string): Promise<void> {
        return this.makeSignInRequest(nextUrl);
    }

    init() {
        this.authenticated.value = !!localStorage.getItem(TOKEN_CODE_STORAGE_KEY);
    }

    /**
     * forces a sign in request even there's a user
     * currently logged in.
     * If current user session is active, its data
     * is first cleared from the local cache.
     */
    async forceSignInNewUser(nextUrl?: string): Promise<void> {
        this.clearLocalSession();
        return this.makeSignInRequest(nextUrl);
    }

    private async makeSignInRequest(nextUrl?: string) {
       this.config.router.push(nextUrl ? { name: 'login', query: { next: nextUrl } } : { name: 'login' });
    }

    async signOut(): Promise<void> {
        const token = await this.getToken();
        if (token) {
            await this.config.apiClient.logout.mutate(token);
        }


        this.clearLocalSession();
        this.config.onSignOut && this.config.onSignOut();

        this.authenticated.value = false;
        this.config.router.push({ name: 'login' });

        const gauth = getGapi().auth2.getAuthInstance();
        if (gauth) {
            await gauth.signOut();
        }
    }

    getToken(): Promise<string|undefined> {
        const tokenString = localStorage.getItem(TOKEN_CODE_STORAGE_KEY);
        if (!tokenString) {
            return Promise.resolve(undefined);
        }
        
        return Promise.resolve(tokenString);
    }

    setToken(token: AuthToken) {
        const serialized = JSON.stringify(token);
        localStorage.setItem(TOKEN_OBJECT_STORAGE_KEY, serialized);
        localStorage.setItem(TOKEN_CODE_STORAGE_KEY, token.code);
        this.authenticated.value = true;
    }

    isAuthenticated() {
        return computed(() => this.authenticated.value);
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
    clearLocalSession() {
        localStorage.removeItem(TOKEN_OBJECT_STORAGE_KEY);
        localStorage.removeItem(TOKEN_CODE_STORAGE_KEY);
    }
}

export interface AuthClientConfig {
    onSignOut?: () => unknown;
    logger?: Logger;
    router: Router;
    apiClient: TrpcApiClient;
}
