import { createAppError } from '../../error.js';
import { PlaybackPackager } from "./types.js";
import { TransferFile } from '@quickbyte/common';

export class PlaybackPackagerRegistry {
    private providers: Map<string, PlaybackPackager> = new Map<string, PlaybackPackager>();

    registerHandler(provider: PlaybackPackager) {
        this.providers.set(provider.name(), provider);
    }

    getPackager(name: string): PlaybackPackager {
        const packager = this.providers.get(name);
        if (!packager) {
            throw createAppError(`Unknown playback packager '${name}'`);
        }

        return packager;
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

export type IPlaybackPackagerProvider = Pick<PlaybackPackagerRegistry, 'getPackager'|'tryFindPackagerForFile'|'getPackagerForFile'>;