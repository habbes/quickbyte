import { createTrpcClient } from "../core/index.js";
import { getToken } from "./auth.js";

const trpcBaseUrl = import.meta.env.VITE_TRPC_BASE_URL;

export const trpcClient = createTrpcClient({
    baseUrl: trpcBaseUrl,
    getToken: () => Promise.resolve(getToken())
});
