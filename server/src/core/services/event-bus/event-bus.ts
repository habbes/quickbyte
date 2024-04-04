import { Transfer } from "@quickbyte/common";
import { IAlertService } from "../admin-alerts-service.js";
import { createServerErrorWithDetails} from "../email/index.js";
import { BackgroundWorker } from "src/core/background-worker.js";

export interface EventDispatcher {
    send(event: Event): void;
}

export interface EventHandlerRegister {
    on(eventType: EventType, handler: EventHandler): void;
}

export class EventBus implements EventDispatcher, EventHandlerRegister {
    private handlers: Map<EventType, EventHandler[]> = new Map<EventType, EventHandler[]>();

    constructor(private config: EventBusConfig) {}

    send(event: Event): void {
        // fire and forget
        const eventType = getEventType(event);
        console.log(`EventBus: sending event ${eventType}`);
        this.executeHandlers(event);
    }

    on(eventType: EventType, handler: (event: Event) => Promise<unknown>): void {
        const handlers = this.handlers.get(eventType) || [];
        handlers.push(handler);
        this.handlers.set(eventType, handlers);
    }

    private async executeHandlers(event: Event) {
        const eventType = getEventType(event);
        const handlers = this.handlers.get(eventType);
        if (!handlers || !handlers.length) {
            return;
        }

        
        // TODO: we could run the handlers in parallel
        // but was too lazy to coordinate for the case
        // where we could have too many handlers running concurrently
        // and clogging the event loop
        console.log(`Queuing ${handlers.length} handler(s) for event ${eventType}`);
        for (const handler of handlers) {
            this.config.workQueue.queueJob(async () => {
                try {
                    await handler(event);
                } catch (e: any) {
                    // TODO: better logging and error management
                    // should send admin email
                    await this.config.alerts.sendNotification(
                        `Error occurred while handling event: '${eventType}'`,
                        createServerErrorWithDetails([{
                            error: e,
                            details: event['data']
                        }])
                    );

                    console.error(`Error occurred while handling event: '${JSON.stringify(event)}' with details: ${e.message}`);
                }
            });
        }

        console.log(`Completed queing event handlers for event event ${eventType}`);
    }
}

export interface EventBusConfig {
    alerts: IAlertService;
    workQueue: BackgroundWorker
}

export function getEventType(event: Event): EventType {
    const eventType = event['type'] as EventType;
    return eventType;
}

export type Event = TransferCompleteEvent | FolderDeletedEvent | ProjectMemberRemovedEvent | FilePlaybackPackagingUpdatedEvent;

export type TransferCompleteEvent = {
    type: 'transferComplete',
    data: {
        transfer: Transfer
    },
}

export type FolderDeletedEvent = {
    type: 'folderDeleted',
    data: {
        projectId: string;
        folderId: string;
    }
}

export type ProjectMemberRemovedEvent = {
    type: 'projectMemberRemoved',
    data: {
        projectId: string;
        memberId: string;
    }
}

export type FilePlaybackPackagingUpdatedEvent = {
    type: 'filePlaybackPackagingUpdated',
    data: {
        packager: string;
        packagerId: string;
    }
}

export type EventType = Event['type'];

// export type EventType = Event['type'];
export type EventHandler = (event: Event) => Promise<unknown>;
