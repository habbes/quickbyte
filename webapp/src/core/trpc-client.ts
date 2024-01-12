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
                    if (token) {
                        return {
                            Authorization: `Bearer ${token}`
                        }
                    }

                    return {};
                }
            })
        ]
    });

    return client;
}

export interface TrpcClientConfig {
    baseUrl: string;
    getToken(): Promise<string|undefined>;
}