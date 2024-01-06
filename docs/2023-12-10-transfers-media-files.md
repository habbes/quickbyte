# 2023-12-10: Transfers, Media and Files

As mentioned in a [previous post](2023-12-08-brainstroming-project-reviews.md), I'm introducing Media assets as a new concept to Quickbyte, representing video, images, document and other media that belong to a project. Media assets are backed by "physical" files uploaded to a storage provider. Quickbyte already has support for file uploads as part of the original Transfers feature. I would like to re-use as much of the existing insfrastructure for file support so that I can implement project media support quickly. The existing file transfer feature implements already implements the following:
- uploading multiple files and folders at a go (in a single transfer): single and multi-file support
- uploading to and downloading from Azure, generating upload and download links, etc.
- generating zip download on the fly from multiple files
- tracking transfer upload progress on the client and resuming incomplete uploads after browser restart
- keeping track of download requests for a transfer and individual files
- keeping track of upload metrics (upload duration, upload location, etc.)

The same file model used for transfers can be used for media assets. We don't need to create a new collection or new model. A file record is fairly generic, the only things that tie it to a transfer are the `tranferId` field and the `originalName`. The `originalName` is a concern because it contains the relative path of the file, i.e. if the file was uploaded as part of a folder, the `originalName` contains the path of the file within that folder, not just the file name. If a file can back one or more media assets, then its original folder path is relevant, especially if projects can have their own folder structure.

The "reasonable" thing to do would probably be to decouple files from transfers and refactor all the upload, download, tracking and recovery implementations (both on the backend and the frontend) to revolve around files rather than transfers. Instead of using a `transferId` on files, a transfer record could store an embedded `files` list where each embedded record could contain the path of the file and the reference id of the actual file record.

However, this sounds like a lot of work. I could be overestimating the workload, maybe it could take a few dedicated days, maybe even 1 or 2. But since I want to complete the a working MVP of end-to-end reviews and collaboration feature by the end of December, I want to avoid a potential refactoring rabbit hole.

So what I plan to do is to re-use most of the existing transfers infrastructure for media assets. Every file upload will happen in the context of a transfer. Even when uploading media for a project. In the case of uploading project media, a transfer will be created to manage the uploads, but this transfer will not result in a shareable link. This will be a "hidden" transfer. The transfer will have some flags that indicate that this transfer is solely meant for uploading media to a specified project. When uploading media for a project, we'll use  a different UI from the one used to transfer files, so there'll be some refactoring to decouple the transfer uploading logic from the UI, but that shouldn't be too much work (hopefully).

With this approach, transfer tracking and recovery feature should also work for media assets (UI improvements can be done later).

Another concern is that files are marked as complete when the transfer is finalized. This makes sense when a transfer is sent as a unit, but when uploading media, it makes sense for each file to be its own thing. But for project media, it makes sense for each file to be "available" as soon as its upload is complete, regardless of other files being uploaded in the same "transfer";

Once the MVP is done and there's some bandwidth, I can reconsider whether it's worthwhile to decouple files from transfers.
