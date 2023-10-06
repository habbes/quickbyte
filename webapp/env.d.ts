/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_SENTRY_DSN: string;
    readonly VITE_SENTRY_TRACES_SAMPLE_RATE: string;
    readonly VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE: string;
    readonly VITE_SENTRY_REPLAY_ERROR_SAMPLE_RATE: string;
    readonly VITE_AAD_CLIENT_ID: string;
    readonly VITE_AAD_AUTHORITY: string;
    /**
     * Client ID of the web API app in Microsoft Entra
     */
    readonly VITE_AAD_API_CLIENT_ID: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }