import { createAppError } from '../../error.js';
import { IStorageHandler, StorageHandlerInfo } from "./types.js";

export class StorageHandlerProvider {
    private providers: Record<string, IStorageHandler> = {};

    registerHandler(provider: IStorageHandler) {
        this.providers[provider.name()] = provider;
    }

    getHandlerInfos(): StorageHandlerInfo[] {
        return Object.values(this.providers).map(p => ({ name: p.name(), availableRegions: p.getAvailableRegions() }));
    }

    getHandler(name: string): IStorageHandler {
        if (!(name in this.providers)) {
            throw createAppError(`Unknown storage provider '${name}'`);
        }

        return this.providers[name];
    }
}

export interface IStorageHandlerProvider extends Pick<StorageHandlerProvider, 'getHandler' | 'getHandlerInfos'> {}
