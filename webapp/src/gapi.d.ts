

declare const gapi: GoogleApi;

export interface GoogleApi {
    load(string, callback: () => any),
    auth2: {
        init({ client_id: string, cookiepolicy: string })
    }
}