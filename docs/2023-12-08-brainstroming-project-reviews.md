# 2023-12-08 Brainstorming projects and reviews

Quickbyte started out as file transfer service, but now I want to evolve it into a collaboration tool for video production teams and their clients. I want to introduce project reviews:

A video producer creates project to share videos he has taken with the client and sends the client a request to review them.
The client accepts the invite and accesses the videos.
The client watches the videos and leaves comments in the videos.
For videos that the client is satisfied with, the client marks them with an "approval".
(Should the client "submit" the review when done with all the comments, or should the comments get "submitted" individually?)
The producer gets an email notifications with the comments.
When the producer logs in, they can see all the comments in the "inbox". Or a notice on the home page should prompt them to open the project reviews.
The project page highlights all the videos with comments. It also marks the one that have approvals.
The producer opens the videos and reads the comments. Potentially leaving replies.
The client gets email updates.
For videos that the producer wants to update, the producer can upload a new version to replace the existing version (the system will view both versions)

Questions:
Should the video producer be able to:
- mark a client's comment as "addressed" or "complete" or "won't fix?" (i.e. should comments be treated as tasks, how much project management should be baked into Quickbyte?)
- view read status of comments


I want to propose a data model that will allow Quickbyte to achieve such scenarios and would be relatively quick to implement (and easy to extend) while leveraging the existing file transfer infrastructure where possible to avoid rewriting code. Also, I'm still planning to keep the file transfer feature around.


Proposed data model:

### Projects

Quickbyte should have projects. A project represents a real-list project/contract that the user is working on. It's a means for organizing all media assets related to a single or related deliverables, usually with a single client (the client could be a company). But it's up the user to decide how to organize projects. Different projects are isolated, i.e. a guest only has access to the projects they've been invited to. Comments exist within a project, etc.

### Media assets

An asset is a logical representation of things like video, images, audio, etc. An asset is backed by a "physical" file. An asset can have multiple versions representating different iterations of the same asset. Each version is backed by a different file. When an asset is fetched, its current version is fetched as well. The "current version" is not necessarily the latest version, the "current version" represents the approved/verified version asset, which may not necessarily be the latest. All the file versions of an asset should be of the same "kind", i.e. if the initial version was a video, then each subsequent version should be a video as well (it could be a different video format though). I'll store "assets" and "files" in separate collections, but I'm not sure whether to embed versions inside an asset or to store versions in a separate collection. I don't expect there to be too many versions per asset, and it will not be possible to fetch a version without its parent asset. That's why I'm considering it for an embedded collection. When an asset is created, a default version will be created automatically, representing the initial version. Other versions will be created when the user manually uploads a new version of the file.

### Comments

Comments are made on a specific version of an asset. A comment has text and an optional time code/timestamp. In future, a comment may have visual annotations that may appear on the the specific frame in the video (or on the image). A comment will have a projectId, so it's easy to list all the comments in a given project, an assetId to link it to the media asset and an assetVersionId to link it to a specific version of the asset. We should track comment reads. So for every comment, we can tell who has read it. Should this be an array of ids or should be a separate collection?

- Should we allow project-level comments that are not tied to a specific asset?
- Should we support replies? Probably not in the first version. But something to think about.

### Files

Files represent "physical" files that have been uploaded. Files exist in their own collection and represent actual files stored in the cloud and can be downloaded. A file record stores metadata as well as information about where it's stored on the cloud so that it can be retrieved/downloaded. Currently files are tied to a transfer via a `transferId`. However, I want to use the same collection to back files used in project assets. The initially idea was to delete files once a transfer has expired, but that has not yet been implemented. If files are used for more than just transfers, then we should not delete files which are used in projects. Also files can be uploaded to a project directly without having to be part of a transfer. And maybe it should be possible to create a transfer out of existing files which have already been uploaded before. This means Quickbyte is almost going to be a cloud storage service, and that's scary :).

### Library/Gallery

The library represents all the files in an account, regardless of which project or transfer they belong to. In the library files representing versions of the same asset will be listed individually as separate files.
