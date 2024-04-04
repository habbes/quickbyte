import { getFileExtension } from "./util.js";

const videoExtensions = new Set([
    'mp4',
    'm4v',
    'mov',
    'mkv'
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
    const rawExt = getFileExtension(filename);
    if (!rawExt) {
        return 'unknown';
    }

    const ext = rawExt.toLowerCase();

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

export function getMimeTypeFromFilename(filename: string): string {
    const ext = (getFileExtension(filename) || filename).toLowerCase();
    const mediaType = getMediaType(ext);

    if (mediaType === 'video') {
        return getVideoMimeType(ext);
    }

    if (mediaType === 'audio') {
        return getAudioMimeType(ext);
    }

    if (mediaType === 'image') {
        return `image/${ext}`;
    }

    // unknown media type
    return `application/${ext}`;
}

function getVideoMimeType(extension: string): string {
    switch (extension) {
        case 'mov':
            // should be video/quicktime, but videos stopped playing on non-Safari browsers
            // Surpringly setting it to video/mp4, video played
            // TODO: this may not always work. Consider workaround, maybe transcoding videos to mp4
            return 'video/mp4';
        case 'mkv':
            // should be video/x-matroska but may not work on all browsers
            return 'video/mp4'
        case 'm4v':
            return 'video/mp4'
        case 'ogg':
            return 'video/ogg'
        case 'mp4':
            return 'video/mp4'
        case 'webm':
            return 'video/webm'
    }

    return `video/${extension}`;
}

function getAudioMimeType(extension: string): string {
    return `audio/${extension}`;
}
