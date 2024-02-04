import { ref } from "vue";

export const googleAuth = ref<GoogleClient['accounts']['id']>();
export const googleUser = ref<GoogleUser>();

export function initGoogleAuth(clientId: string) {
    window.addEventListener('load', () => {
        google.accounts.id.initialize({
            client_id: clientId,
            ux_mode: 'popup',
            callback: (user) => {
                googleUser.value = user;
            }
        });

        googleAuth.value = google.accounts.id;
    });
}


// see: https://developers.google.com/identity/gsi/web/reference/js-reference
export interface GoogleClient {
    accounts: {
        id: {
            initialize(config: {
                client_id: string,
                // see: https://developers.google.com/identity/gsi/web/guides/handle-credential-responses-js-functions
                callback: (response: GoogleUser) => any,
                ux_mode?: 'popup' | 'redirect'
            }): void,
            prompt(): void,
            renderButton(parent: HTMLElement, config: {
                type: 'icon' | 'standard',
                size?: 'large' | 'small' | 'medium',
                width?: number,
                logo_alignment?: 'left' | 'center',
                theme?: 'outline' | 'filled_blue' | 'filled_black',
                click_listener?: () => any,
            }): void,
        }
    }
}

export interface GoogleUser {
    credential: string,
    name: string,
    family_name: string,
    given_name: string,
    picture: string,
    email: string
}

declare const google: GoogleClient;

