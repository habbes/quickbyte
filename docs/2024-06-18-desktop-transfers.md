# 2024-06-18 Desktop app for large transfers

I want to create a Quickbyte desktop. The app will be focused on transfers: uploads and downloads (unless customers ask for more). The motivation for this is to get faster and more reliable uploads and downloads of large files (like > 10 GB). Quickbyte web-based downloads are relatively slow. I haven't yet figured out why they don't go past 2MB/s (I should probably reach out to Azure to request help). Further more uploads and downloads on the web only make progress while the browser tab is open. And while we do allow resuming uploads on the browser, it requires a lot of steps and the user experience is suboptimal.

It was a struggle for me to get Habbes Live Experience concert videos sent to me via Quickbyte (or even via Mega Upload), and it was a struggle to download them from the web.

With a desktop app, we'll have direct access to the file system and we'll not be restricted to the browser. We can perform file transfers in the background, we can probably resume transfers automatically when the machine restarts or at least when the app is restarted.

The first milestone of the app is to perform resumable uploads to a project (and generate a project share link) and to download files from a share link (or quick transfer link).

I've decided to use [Tauri](https://tauri.app) to build the app. This will allow me to build the frontend in Vue.js and (hopefully) reuse some of the UI components I have on the web app. It also results in smaller bundle size and memory footprint than Electron. It supports more platforms that .NET MAUI.