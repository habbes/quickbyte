# 2024-06-18 Desktop app for large transfers

I want to create a Quickbyte desktop. The app will be focused on transfers: uploads and downloads (unless customers ask for more). The motivation for this is to get faster and more reliable uploads and downloads of large files (like > 10 GB). Quickbyte web-based downloads are relatively slow. I haven't yet figured out why they don't go past 2MB/s (I should probably reach out to Azure to request help). Further more uploads and downloads on the web only make progress while the browser tab is open. And while we do allow resuming uploads on the browser, it requires a lot of steps and the user experience is suboptimal.

It was a struggle for me to get Habbes Live Experience concert videos sent to me via Quickbyte (or even via Mega Upload), and it was a struggle to download them from the web.

With a desktop app, we'll have direct access to the file system and we'll not be restricted to the browser. We can perform file transfers in the background, we can probably resume transfers automatically when the machine restarts or at least when the app is restarted.

The first milestone of the app is to perform resumable uploads to a project (and generate a project share link) and to download files from a share link (or quick transfer link).

I've decided to use [Tauri](https://tauri.app) to build the app. This will allow me to build the frontend in Vue.js and (hopefully) reuse some of the UI components I have on the web app. It also results in smaller bundle size and memory footprint than Electron. It supports more platforms that .NET MAUI.

## V1 features

I have just about 2 weeks from work and want to use it to build and ship the first version of the desktop transfer app. I aim for the following features:

- Upload files to a shareable transfer link not tied to a project
- Upload files to a project
- Launch a project file or folder in Quickbyte on the browser
- Create a shareable transfer link to files in a project
- Download files from a shareable transfer link
- Uploads and downloads can be resumed and complete in the background
- Uploads and downloads can resume when the OS starts (background service, daemons)
- Download files from a project (nice to have)

Uploading files, creating shared links and interacting with a project will require the user to be authenticated. Download files from a shared link will not require authentication or a Quickbyte account.

I am aiming for a minimal app that can be completed within 2 weeks. Any additional feature is a nice-to-have (including previewing files or even showing thumbnails).

## V1 high-level components

The app will have a:

- Main window that allows the user to create transfers and track transers and downloads, navigate projects, etc.
- App tray that can show status of ongoing uploads or downloads (nice-to-have)
- Background service that performs the actual transfers and downloads

The background service should ideally make it possible for the uploads and downloads to continue even when the app window is closed. The background service should ideally also be registered to be launched by the OS on startup so that uploads and downloads can be resumed even after OS restarts. I have noticed that WeTransfer and Frame.io desktop transfer apps don't seem to support resumability or background uploads, not sure why. Makes me wonder whether there's some obstacle that I'll meet along the way with this architecture.

I plan to use [Tauri](https://tauri.app) for the UI of the app (the main app window and app tray). I chose this cause it promises a more lightweight app than electron. It's also an opportunity for me to use Rust for the first time in an app after learning it 2 years ago and never using it after that (I've become rusty). However, since it's my first time, it might impact my productivity. If I notice I can't move fast enough in Rust, I'll create the background service, which will do most of the heavy lifting, in C# which is more up my alley. With .NET AOT I can still create relatively lighweight cross-platform native executable binaries. If I can move fast enough with Rust, I could build the background service in Rust as well.

