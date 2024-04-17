# 2024-04-15 Share project files to people without Quickbyte accounts

There's been explicit demand for being able to share media with people who don't have Quickbyte accounts. This is a feature that was inevitable, but I had not yet gotten the time to work on it.

This is the current status of file sharing on Quickbyte:

- The "Quick transfer" feature let's you upload and share files via a download link. Anyone with that download link can download the files that were uploaded as part of that transfer. You can download the files individually or download all files as a zip. You cannot play videos/audios or preview images.
- You can invite people to your project. Anyone invited to a project can see the files in that project. You can play media and view images. You can download files individually, but not multiple files at once. The invited user has to login to be able to access the files.

The problems are obvious. There are two ways to share files. These two approaches are incompatible (i.e. currently no way to publicly share project files and no way to add "quick transfer" files to a project).

Eventually these two features should be unified:
- It should be possible to play media when sharing files via quick transfer.
- It should also be possible to add those files to a project.
- It should be possible to share project media files via public links to people without Quickbtyte accounts.

For now I'll focus on the last item: sharing project files.

The first approach is to leverage guest users (which I did not complete implementing). The idea of a guest user is someone who can access a Quickbyte project without creating a full account. Here's how this would work:

- An account admin or owner invites a user to a project using the email address
- The invitee gets an email with the invite link
- When the user clicks the link, if they don't have an account, we can exchange the invite code for some access token
- We may need a magic-link email to account for the fact that access tokens may expire
- Should guest users be limited to reviewer role?

The other approach is to allow a project owner or admin to create download links from project files. A project download link can span all the files in a project, or select files and folders. Initially, I thought of using transfers feature for this: to share project files, the system will create a transfer object behind the scenes and then we can re-use the existing logic for generating download links from a transfer. The idea was to re-use as much of the existing infrastructure as possible to implement this feature quickly. But this approach leads to a number of issues.

The main problem is that each file has a single `transferId`, and that's how we tell which files belong to a transfer. If we want to share project files, those projects already belong to a transfer. We would have to refactor files or transfers to allow many-to-many relationships between files and transfers. I think this can introduce unncessary complexity. I think it's simpler to think of a `transfer` as a group of files uploaded together. But multiple shares can be created from these files indepdentently of each other.

To model this better, we should create a new type of record. Something like a `FileShare` or `Share` or something like that. This represents a group of files that are made available together behind a download link. The share will encapsulate restrictions like whether the files can be downloaded, whether comments are allowed, whether email is required, expiry date, etc. This record can also be used to keep track of download requests, views, etc.

The other problem is that projects don't store files objects directly, but media objects. A media item encapsulates one or more files (multiple versions) and comments.
So what should a file share contain, should it contain references to the files? Should it contain references to the media items? Should it contain references to the selected folders?

Storing the media items and folder records in the share will enable more flexibility and advanced use cases compared to sharing direct file references. If the media or folder is updated in the project (e.g. renaming, deletion, new versions, etc.) These will reflect on the link download page as well. We can allow the person sharing to decide whether the recipients should be able to see all versions, whether they can download files, whether they can add comments. We can allow the user to set the expiry date, set a passphrase, generate a link or just specify recipient emails (or both).

```ts
interface FileShare {
    projectId: string;
    inviteUsers?: Array<{ name?: string, email: string }>;
    enabled?: boolean;
    password?: string;
    expiresAt?: Date;
    allowDownload?: boolean;
    showAllVersions?: boolean;
    items: Array<{ item: ProjectItemType, itemId: string }>;
}

type ProjectItemType = 'folder'|'media';
```