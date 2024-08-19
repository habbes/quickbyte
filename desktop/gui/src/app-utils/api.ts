import { createTrpcClient } from "../core/index.js";

const trpcBaseUrl = import.meta.env.VITE_TRPC_BASE_URL;

export const trpcClient = createTrpcClient({
    baseUrl: trpcBaseUrl,
    getToken: () => Promise.resolve('') // TODO handle authentication
});