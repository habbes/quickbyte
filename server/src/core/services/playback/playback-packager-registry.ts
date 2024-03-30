import { createAppError } from '../../error.js';
import { PlaybackPackager } from "./types.js";
import { TransferFile } from '@quickbyte/common';

export class PlaybackPackagerRegistry {
    private providers: Map<string, PlaybackPackager> = new Map<string, PlaybackPackager>();
    private defaultPackagerName: string;

    registerHandler(provider: PlaybackPackager, setDefault: boolean = false) {
        this.providers.set(provider.name(), provider);
        if (!this.defaultPackagerName || setDefault) {
            this.defaultPackagerName = provider.name();
        }

    }

    getPackager(name: string): PlaybackPackager {
        if (!(name in this.providers)) {
            throw createAppError(`Unknown playback packager '${name}'`);
        }

        return this.providers.get(name);
    }

    tryFindPackagerForFile(file: TransferFile): PlaybackPackager|undefined {
        for (let packager of this.providers.values()) {
            if (packager.canPackage(file)) {
                return packager;
            }
        }
    }

    getPackagerForFile(file: TransferFile): PlaybackPackager {
        const packager = this.tryFindPackagerForFile(file);
        if (packager) {
            return packager;
        }

        throw createAppError(`Could not find suitable packager for file with id: '${file._id}' name: '${file.name}'`);
    }
}
