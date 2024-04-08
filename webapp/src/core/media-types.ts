import { getFileExtension } from ".";

// see: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types

const videoExtensions = new Set([
    'mp4',
    'm4v',
    'mov',
    'mkv',
    'mpeg',
    'ogv',
    'avi',
    '3gp',
    '3g2',
    'webm',
    'ts' // this could be TypeScript, but I doubt the target market would be uploading typescript files :)
]);
const audioExtensions = new Set([
    'mp3',
    'wav',
    'aac',
    'weba',
    'mid',
    'midi',
    'opus',
    'wav',
    'oga',
]);
const imageExtensions = new Set([
    'png',
    'jpeg',
    'jpg',
    'webp',
    'apng',
    'avif',
    'bmp',
    'gif',
    'ico',
    'svg',
    'tif',
    'tiff'
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
        return getImageMimeType(ext);
    }

    switch (ext) {
        // hls
        case 'm3u8': return 'application/x-mpegurl';
        // DASH
        case 'mpd': return 'application/dash+xml';
    }

    // unknown media type
    return `application/${ext}`;
}

function getVideoMimeType(extension: string): string {
    switch (extension) {
        case 'avi': 'video/x-msvideo'
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
            return 'video/webm';
        case 'ts': 'video/mp2t'
    }

    return `video/${extension}`;
}

function getAudioMimeType(extension: string): string {
    switch (extension) {
        case 'aac': return 'audio/aac';
        case 'mp3': return 'audio/mpeg';
        case 'mid': return 'audio/midi';
        case 'midi': return 'audio/midi';
        case 'oga': return 'audio/ogg';
        case 'opus': return 'audio/opus';
        case 'wav': return 'audio/wav';
        case 'weba': return 'audio/webm';
        case '3gp': return 'audio/3gpp';
        case '3g2': return 'audio/3gpp2';
    }

    return `audio/${extension}`;
}

function getImageMimeType(extension: string): string {
    switch (extension) {
        case 'jpg': return 'image/jpeg';
        case 'ico': return 'image/vnd.microsoft.icon';
        case 'svg': return 'image/svg+xml';
        case 'tif': return 'image/tiff'
    }

    return `image/${extension};`
}