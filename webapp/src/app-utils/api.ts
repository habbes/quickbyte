import { ApiClient } from '@/core';
import { auth } from './auth.js';

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export const apiClient = new ApiClient({
    baseUrl,
    getToken: () => auth.getToken()
});
