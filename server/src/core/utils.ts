import { randomBytes } from 'crypto';
import { FileKind } from './models.js';

export function generateId() {
    return randomBytes(16).toString('base64url');
}

export function fileNameToFileKind(filename: string): FileKind {
    if (!filename.includes('.')) {
        return 'other';
    }

    throw new Error('Not implemented');
}