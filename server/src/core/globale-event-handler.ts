import { EventBus, Event, getEventType, EmailHandler, createProjectMediaUploadNotificationEmail, LinkGenerator, sendEmailToMany, createProjectMediaVersionUploadNotificationEmail, createProjectMediaMultipleVersionsUploadNotificationEmail, FolderDeletedEvent, TransferCompleteEvent, ProjectMemberRemovedEvent, createYouHaveBeenemovedFromProjectNoticiationEmail, FilePlaybackPackagingUpdatedEvent, updateFilePackagingMetadata, IPlaybackPackagerProvider, queueTransferFilesForPackaging } from "./services/index.js";
import { createAppError, createInvalidAppStateError, createNotFoundError, createResourceNotFoundError, rethrowIfAppError } from "./error.js";
import { Database, getProjectMembersById } from "./db/index.js";
import { Media, Project, User } from "./models.js";
import { BackgroundWorker } from "./background-worker.js";
import { wrapError } from "./utils.js";

export class GlobalEventHandler {
    constructor(private config: GlobalEventHandlerConfig) {}

    registerEvents(eventBus: EventBus) {
        eventBus.on('transferComplete', (event) => this.handleTransferComplete(event));
        eventBus.on('folderDeleted', (event) => this.handleFolderDeleted(event));
        eventBus.on('projectMemberRemoved', (event) => this.handleProjectMemberRemoved(event));
        eventBus.on('filePlaybackPackagingUpdated', (event) => this.handleFilePlaybackPackagingUpdated(event));
    }

    private async handleProjectMemberRemoved(event: Event): Promise<void> {
        try {
            const data = this.getEventData<ProjectMemberRemovedEvent>('projectMemberRemoved', event);
            console.log(`Handling event: user '${data.memberId}' removed from project '${data.projectId}'`);
            const user = await this.config.db.users().findOne({
                _id: data.memberId,
            }, {
                projection: {
                    name: 1,
                    email: 1,
                }
            });
            if (!user) {
                throw createResourceNotFoundError("user");
            }

            const project = await this.config.db.projects().findOne({
                _id: data.projectId
            });
            if (!project) {
                throw createResourceNotFoundError("project")
            }

            console.log(`Sending email notification to '${user._id}' about removal from '${project._id}'`);
            await this.config.email.sendEmail({
                to: { name: user.name, email: user.email },
                subject: `You have been removed from project ${project.name}`,
                message: createYouHaveBeenemovedFromProjectNoticiationEmail({
                    projectName: project.name
                })
            });
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    private async handleFolderDeleted(event: Event): Promise<void> {
        try {
            const data = this.getEventData<FolderDeletedEvent>('folderDeleted', event);
            
            console.log(`Handling folderDeleted event for '${data.folderId}' of project ${data.projectId}`);
            const folder = await this.config.db.folders().findOne({ projectId: data.projectId, _id: data.folderId });
            if (!folder) {
                console.log(`Folder ${data.folderId} not found. Aborting...`);
                return;
            }

            if (!folder?.deleted) {
                console.log(`Folder ${data.folderId} found but not deleted. Aborting...`);
                return;
            }

            console.log(`Found deleted folder ${data.folderId}. Queueing job to clean up folder subtree and mark contents as parentDeleted...`);
            const worker = this.config.backgroundWorker;
            const projectId = data.projectId;
            const folderIds = [data.folderId];
            const db = this.config.db;
            // TODO: It's possible that the server might shutdown before the job has updated all the records,
            // this would leave the system in some invalid state. We should be able to detect
            // unfinished jobs and resume/complete them after system restart or error
            this.config.backgroundWorker.queueJob(() => queueDeletedFolderCleanupTask(folderIds, projectId, worker, db));
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    private async handleTransferComplete(event: Event): Promise<void> {
        try {
            const data = this.getEventData<TransferCompleteEvent>('transferComplete', event);
            const transfer = data.transfer;
            // currently we only care about transfers tied to project uploads
            console.log(`Handle transferComplete event for '${transfer._id}'`);
            console.log(`Queuing transfer ${transfer._id} files for packaging...`);
            await queueTransferFilesForPackaging(
                transfer._id,
                { db: this.config.db, queue: this.config.backgroundWorker, packagers: this.config.playbackPackagers }
            );

            if (!transfer.projectId) {
                console.log('Transfer has not project. Skip...');
                return;
            }

            // find project collaborators
            const project = await this.config.db.projects().findOne<Project>({ _id: transfer.projectId });
            if (!project) {
                throw createNotFoundError('project');
            }

            const uploader = await this.config.db.users().findOne<User>({ _id: transfer._createdBy._id }, { projection: { name: 1 } });
            if (!uploader) {
                throw createNotFoundError('user');
            }
            const members = await getProjectMembersById(this.config.db, transfer.projectId);
            // don't send to the sender
            const recipients = members.filter(m => m._id !== transfer._createdBy._id);
            if (recipients.length === 0) {
                console.log('No collaborators to notify');
                return;
            }
            if (!transfer.mediaId) {
                // new media being uploaded
                await sendEmailToMany(
                    this.config.email,
                    recipients,
                    {
                        subject: `New files uploaded to ${project.name}`,
                        message: createProjectMediaUploadNotificationEmail({
                            uploaderName: uploader.name,
                            projectName: project.name,
                            projectUrl: this.config.links.getProjectUrl(project._id),
                            numFiles: transfer.numFiles
                        })
                    }
                );
                return;
            }

            // uploading a new versions of existing media
            const media = await this.config.db.media().findOne<Media>({ _id: transfer.mediaId });
            if (!media) {
                throw createNotFoundError('media');
            }

            // get transfer files
            
            if (transfer.numFiles === 1) {
                // only a single version
                const file = await this.config.db.files().findOne({ transferId: transfer._id });
                if (!file) {
                    throw createInvalidAppStateError(`Expected to find at least one file linked to transfer '${transfer._id}' but didn't.`);
                }

                const version = media.versions.find(v => v.fileId === file._id);
                if (!version) {
                    throw createInvalidAppStateError(`Expected to find version for file '${file._id}' on media '${media._id}' but didn't.`);
                }
                
                await sendEmailToMany(
                    this.config.email,
                    recipients,
                    {
                        subject: `New version of ${media.name} uploaded to project`,
                        message: createProjectMediaVersionUploadNotificationEmail({
                            projectName: project.name,
                            mediaName: media.name,
                            uploaderName: uploader.name,
                            mediaVersionUrl: this.config.links.getMediaVersionUrl(project._id, media._id, version._id)
                        })
                    }
                );

                return;
            }

            // multiple versions
            await sendEmailToMany(
                this.config.email,
                recipients,
                {
                    subject: `New versions of ${media.name} uploaded to project`,
                    message: createProjectMediaMultipleVersionsUploadNotificationEmail({
                        projectName: project.name,
                        mediaName: media.name,
                        uploaderName: uploader.name,
                        numFiles: transfer.numFiles,
                        mediaUrl: this.config.links.getMediaUrl(project._id, media._id)
                    })
                }
            );
            
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
        
    }

    private async handleFilePlaybackPackagingUpdated(event: Event): Promise<void> {
        await wrapError(async () => {
            const data = this.getEventData<FilePlaybackPackagingUpdatedEvent>("filePlaybackPackagingUpdated", event);
            console.log(`Handling filePlaybackPackagingUpdated event for package '${data.packagerId}' of packager '${data.packager}'`);
            await updateFilePackagingMetadata(
                data.packager,
                data.packagerId,
                {
                    packagerProvider: this.config.playbackPackagers,
                    db: this.config.db
                }
            );
        });
    }

    private getEventData<TEvent extends Event>(expectedType: TEvent['type'], event: Event): TEvent['data'] {
        const actualType = getEventType(event);
        if (expectedType !== actualType) {
            throw createInvalidAppStateError(`Expected event '${expectedType}' but got '${actualType}'`);
        }

        return event['data'];
    }
}

export interface GlobalEventHandlerConfig {
    db: Database;
    email: EmailHandler;
    links: LinkGenerator;
    backgroundWorker: BackgroundWorker;
    playbackPackagers: IPlaybackPackagerProvider;
}

async function queueDeletedFolderCleanupTask(parentFolderIds: string[], projectId: string, worker: BackgroundWorker, db: Database) {
    // remove children of the parents
    console.log(`About to mark undeleted child folders of ${parentFolderIds.length} parents as parentDeleted...`);
    const result = await db.folders().updateMany({
        parentId: { $in: parentFolderIds },
        projectId: projectId ,
        deleted: { $ne: true }
    }, {
        $set: {
            parentDeleted: true
        }
    });
    console.log(`Marked ${result.modifiedCount} folders as parentDeleted`);

    // remove media of the parents
    console.log(`About to mark undeleted media of ${parentFolderIds} folders as parentDeleted...`);
    const mediaResult = await db.media().updateMany({
        folderId: { $in: parentFolderIds },
        projectId: projectId,
        deleted: { $ne: true }
    }, {
        $set: {
            parentDeleted: true
        }
    });

    console.log(`Marked ${mediaResult.modifiedCount} media items as parentDeleted...`);

    // find children folders of the parents
    const deletedSubFolders = await db.folders().find({
        parentId: { $in: parentFolderIds },
        projectId: projectId,
        parentDeleted: true
    }, {
        projection: {
            _id: 1
        }
    }).toArray();
    const deletedSubFolderIds = deletedSubFolders.map(f => f._id);
    if (!deletedSubFolderIds.length) {
        console.log(`No more child folders found. Folder tree deletion complete.`);
        return;
    }

    // queue task for child folders cleanup
    console.log(`Found ${deletedSubFolders.length} child folders. Queuing their decendents for cleanup...`);
    worker.queueJob(() => queueDeletedFolderCleanupTask(deletedSubFolderIds, projectId, worker, db));
}
