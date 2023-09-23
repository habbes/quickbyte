import { createApp } from 'vue'
import * as Sentry from "@sentry/vue";

import './styles/style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
        new Sentry.BrowserTracing({
            // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
            tracePropagationTargets: ["localhost", import.meta.env.VITE_API_BASE_URL],
            routingInstrumentation: Sentry.vueRouterInstrumentation(router),
          }),
          new Sentry.Replay(),
    ],
    // Performance Monitoring
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE) || 0.25,
    // Session Replay
    replaysSessionSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE) || 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAY_ERROR_SAMPLE_RATE) || 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

app.use(router)

app.mount('#app')
