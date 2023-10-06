/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_SENTRY_DSN: string;
    readonly VITE_SENTRY_TRACES_SAMPLE_RATE: string;
    readonly VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE: string;
    readonly VITE_SENTRY_REPLAY_ERROR_SAMPLE_RATE: string;
    readonly VITE_AAD_CLIENT_ID: string;
    readonly VITE_AAD_AUTHORITY: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }