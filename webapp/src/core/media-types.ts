import { getFileExtension } from ".";

const videoExtensions = new Set([
    'mp4',
    'mov'
]);
const audioExtensions = new Set([
    'mp3',
    'wav'
]);
const imageExtensions = new Set([
    'png',
    'jpeg',
    'jpg'
]);

export type MediaType = 'image'|'audio'|'video'|'unknown';

export function getMediaType(filename: string): MediaType {
    const ext = getFileExtension(filename);
    if (!ext) {
        return 'unknown';
    }

    if (videoExtensions.has(ext)) {
        return 'video';
    }

    if (imageExtensions.has(ext)) {
        return 'image';
    }

    if (audioExtensions.has(ext)) {
        return 'audio';
    }

    return 'unknown';
}