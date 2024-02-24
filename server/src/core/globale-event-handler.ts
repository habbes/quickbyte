import { EventBus, Event, EventType, getEventType, EmailHandler, createProjectMediaUploadNotificationEmail, LinkGenerator, sendEmailToMany, createProjectMediaVersionUploadNotificationEmail, createProjectMediaMultipleVersionsUploadNotificationEmail } from "./services/index.js";
import { AppServices } from './bootstrap.js';
import { createAppError, createInvalidAppStateError, createNotFoundError, rethrowIfAppError } from "./error.js";
import { Database, getProjectMembersById } from "./db/index.js";
import { Media, Project, User } from "./models.js";

export class GlobalEventHandler {
    constructor(private config: GlobalEventHandlerConfig) {}

    registerEvents(eventBus: EventBus) {
        eventBus.on('transferComplete', (event) => this.handleTransferComplete(event));
    }

    private async handleTransferComplete(event: Event): Promise<void> {
        try {
            const data = this.getEventData('transferComplete', event);
            const transfer = data.transfer;
            // currently we only care about transfers tied to project uploads
            console.log(`Handle transferComplete event for '${transfer._id}'`);
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

    private getEventData<TExpectedType extends EventType>(expectedType: TExpectedType, event: Event): Event[TExpectedType] {
        const actualType = getEventType(event);
        if (expectedType !== actualType) {
            throw createInvalidAppStateError(`Expected event '${expectedType}' but got '${actualType}'`);
        }

        return event[expectedType];
    }
}

export interface GlobalEventHandlerConfig {
    db: Database;
    email: EmailHandler;
    links: LinkGenerator
}