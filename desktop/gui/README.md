# Quickbyte Transfer Desktop App

Built with [Tauri](https://tauri.dev) and Vue 3.

# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Type Support For `.vue` Imports in TS

Since TypeScript cannot handle type information for `.vue` imports, they are shimmed to be a generic Vue component type by default. In most cases this is fine if you don't really care about component prop types outside of templates. However, if you wish to get actual prop types in `.vue` imports (for example to get props validation when using manual `h(...)` calls), you can enable Volar's Take Over mode by following these steps:

1. Run `Extensions: Show Built-in Extensions` from VS Code's command palette, look for `TypeScript and JavaScript Language Features`, then right click and select `Disable (Workspace)`. By default, Take Over mode will enable itself if the default TypeScript extension is disabled.
2. Reload the VS Code window by running `Developer: Reload Window` from the command palette.

You can learn more about Take Over mode [here](https://github.com/johnsoncodehk/volar/discussions/471).

## Use Diesel CLI for migrations and ORM operations

The app uses Diesel ORM to interact with the SQLite database for data persistence (e.g. being able to resume incomplete transfers).

Check out [the getting started guide](https://diesel.rs/guides/getting-started). The guide uses Postgres, but they have [SQLite examples](https://github.com/diesel-rs/diesel/tree/2.2.x/examples/sqlite) in their repo.

```
cargo install diesel_cli
```

To create and run migrations during development, the `diesel` CLI requires a development database. Since we don't bundle the db with the app, I'd recommend creating a temporary db file at `src-tauri/test.db` for use with `diesel` migration commands:

```
cd src-tauri
```

Generate new migration:

```
diesel migration generate create_transfers --database-url testdb
```

Run migrations:

```
diesel migration run --database-url testdb
```

## Running the app

```
cargo tauri dev
```