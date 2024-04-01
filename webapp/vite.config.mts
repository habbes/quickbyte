import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
// see: https://www.vidstack.io/docs/player/getting-started/installation/vue?provider=video&styling=default-layout&bundler=vite
import { vite as vidstack } from 'vidstack/plugins';
import { sentryVitePlugin } from "@sentry/vite-plugin";
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true // required for Sentry source maps
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('media-'),
        },
      },
    }),
    // This filter will only parse files placed in a `/player` directory. This can help avoid
    // slow builds due to parsing all files
    vidstack({ include: /Player/ }),
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
