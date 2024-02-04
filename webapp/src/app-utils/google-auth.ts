import { ref } from "vue";

export const googleAuth = ref<GoogleApi['auth2']>();

export const initGoogleAuth = function (clientId: string) {
    // we load the google client after page load to ensure
    // that its script tag has loaded
    window.addEventListener('load', () => {
        gapi.load('auth2', function () {
            // Retrieve the singleton for the GoogleAuth library and set up the client.
            const auth2 = gapi.auth2.init({
                client_id: clientId,
                cookiepolicy: 'single_host_origin',
            });

            googleAuth.value = auth2;
        });
    });
};

declare const gapi: GoogleApi;

export interface GoogleApi {
    load(api: string, callback: () => any): any,
    auth2: {
        init(options: { client_id: string, cookiepolicy: string }): any
        attachClickHandler(el: HTMLElement, options: any, onSuccess: (user: GoogleUser) => any, onFailure: (error: any) => any): void;
        currentUser: {
            get(): GoogleUser|null;
        },
        getAuthInstance(): {
            signOut(): Promise<void>
        } | null
    },
}

export interface GoogleUser {
    getId(): string;
    getName(): string;
    getGivenName(): string;
    getFamilyName(): string;
    getEmail(): string;
    getImageUrl(): string;
    getAuthResponse(): {
        id_token: string;
    }
}

export function getGapi() {
    return gapi;
}
