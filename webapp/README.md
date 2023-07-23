# Quickbyte web app

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of `.vue` types.

If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:

1. Disable the built-in TypeScript Extension
    1) Run `Extensions: Show Built-in Extensions` from VSCode's command palette
    2) Find `TypeScript and JavaScript Language Features`, right click and select `Disable (Workspace)`
2. Reload the VSCode window by running `Developer: Reload Window` from the command palette.

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Deployment configuration

The web app is deployed to [https://vercel.com](Vercel) project: https://vercel.com/habbes/quickbyte to domains
- pre.quickbyte.io
- staging.quickbyte.io

A review deployment happens automatically for each PR we create. The production deployment happens automatically
when we merge to the main branch.

The app is configured to report errors to Sentry. To configure Sentry in production, make sure to configure
the sentry env variables required for the Sentry configuration. See [./.env.d.ts](`env.d.ts`) to see which env variables
are available, and check [./main.ts](`main.ts`) to see how the configuration is used.

We also have configured Sentry to capture source maps at build time and send them to Sentry for better stack traces.
For Sentry to be able to send the source maps, We need to add the `SENTRY_AUTH_TOKEN` environment variable to the
build server (e.g. Vercel or CI). To update Sentry source maps configuration, run the following command on the local
development machine: `npx @sentry/wizard@latest -i sourcemaps`.

