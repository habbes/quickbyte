import { createTrpcClient } from "../core/index.js";

const trpcBaseUrl = import.meta.env.VITE_TRPC_BASE_URL;


const token = import.meta.env.VITE_TEST_TOKEN;

export const trpcClient = createTrpcClient({
    baseUrl: trpcBaseUrl,
    getToken: () => Promise.resolve(token) // TODO handle authentication
});