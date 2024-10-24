import { ensure } from "@quickbyte/common";
import { createTrpcClient, TrpcApiClient } from "../core/index.js";
import { getToken } from "./auth.js";

let _trpcUrl: string;
let _userAgent: string;
let _trpcClient: TrpcApiClient; 

export function setTrpcUrl(url: string) {
    _trpcUrl = url;
}

export function setTrpcUserAgent(userAgent: string) {
    _userAgent = userAgent;
}

export function trpcClient() {
    if (!_trpcClient) {
        _trpcClient = createTrpcClient({
            baseUrl: ensure(_trpcUrl, 'Failed to read _trpcUrl, ensure setTrpcUrl is called before any request is made.'),
            userAgent: _userAgent,
            getToken: () => Promise.resolve(getToken())
        });
    }

    return _trpcClient;
}