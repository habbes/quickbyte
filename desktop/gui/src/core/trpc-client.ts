import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import supersjon from "superjson";
import type { AppRouter } from '@quickbyte/server';

export function createTrpcClient(config: TrpcClientConfig) {
    const client = createTRPCProxyClient<AppRouter>({
        transformer: supersjon,
        links: [
            httpBatchLink({
                url: config.baseUrl,
                async headers() {
                    const token = await config.getToken();
                    const headers: Record<string, string> = {};

                    if (token) {
                        headers.Authorization = `Bearer ${token}`;
                    }

                    if (config.userAgent) {
                        headers["User-Agent"] = config.userAgent;
                    }

                    return headers;
                }
            })
        ]
    });

    return client;
}

export interface TrpcClientConfig {
    baseUrl: string;
    userAgent?: string;
    getToken(): Promise<string|undefined>;
}

export type TrpcApiClient = ReturnType<typeof createTrpcClient>;
