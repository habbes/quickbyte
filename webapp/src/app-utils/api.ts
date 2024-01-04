import { ApiClient, createTrpcClient } from '@/core';
import { auth } from './auth.js';

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export const apiClient = new ApiClient({
    baseUrl,
    getToken: () => auth.getToken()
});

const trpcBaseUrl = import.meta.env.VITE_TRPC_BASE_URL;

export const trpcClient = createTrpcClient({
    baseUrl: trpcBaseUrl,
    getToken: () => auth.getToken()
});
