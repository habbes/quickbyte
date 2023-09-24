import { PaymentHandler } from './types.js';
import { createAppError } from '../../error.js';

export class PaymentHandlerProvider {
    private handlers: Record<string, PaymentHandler> = {};
    private defaultHandler?: string;

    register(handler: PaymentHandler, isDefault: boolean = false) {
        this.handlers[handler.name()] = handler;
        if (isDefault || !this.defaultHandler) {
            this.defaultHandler = handler.name();
        }
    }

    getByName(name: string) {
        const handler = this.handlers[name];
        if (!handler) {
            throw createAppError(`Could not find payment handler ${name}`);
        }

        return handler;
    }

    getDefault() {
        if (!this.defaultHandler) {
            throw createAppError('Default handler not set');
        }

        return this.getByName(this.defaultHandler);
    }
}

export type IPaymentHandlerProvider = Pick<PaymentHandlerProvider, 'getByName'|'getDefault'>;