import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import { sentryVitePlugin } from "@sentry/vite-plugin";
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true // required for Sentry source maps
  },
  plugins: [
    vue(),
    // Put the Sentry vite plugin after all other plugins
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "quickbyte",
      project: "quickbyte-webapp",
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
