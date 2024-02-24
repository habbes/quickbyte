import { Transfer } from "@quickbyte/common";
import { IAlertService } from "../admin-alerts-service";
import { createServerErrorWithDetails} from "../email";

export interface EventDispatcher {
    send(event: Event): void;
}

export interface EventHandlerRegister {
    on(eventType: EventType, handler: EventHandler): void;
}

export class EventBus implements EventDispatcher, EventHandlerRegister {
    private handlers: Map<EventType, EventHandler[]> = new Map();

    constructor(private config: EventBusConfig) {}

    send(event: TransferEvent): void {
        // fire and forget
        this.executeHandlers(event);
    }

    on(eventType: EventType, handler: (event: Event) => Promise<unknown>): void {
        const handlers = this.handlers.get(eventType) || [];
        handlers.push(handler);
        this.handlers.set(eventType, handlers);
    }

    private async executeHandlers(event: Event) {
        const handlers = this.handlers.get(event.name);
        if (!handlers || !handlers.length) {
            return;
        }

        // TODO: we could run the handlers in parallel
        // but was too lazy to coordinate for the case
        // where we could have too many handlers running concurrently
        // and clogging the event loop
        for (const handler of handlers) {
            try {
                await handler(event);
            } catch (e: any) {
                // TODO: better logging and error management
                // should send admin email
                await this.config.alerts.sendNotification(
                    `Error occurred while handling event: '${event}'`,
                    createServerErrorWithDetails([{
                        error: e,
                        details: event.data
                    }])
                );

                console.error(`Error occurred while handling event: '${event}' with details: ${e.message}`);
            }
        }
    }
}

export interface EventBusConfig {
    alerts: IAlertService;
}

export type Event = TransferEvent;

type TransferEvent = {
    name: 'transferComplete',
    data: {
        transfer: Transfer
    }
}

type EventType = Event['name'];
type EventHandler = (event: Event) => Promise<unknown>;
