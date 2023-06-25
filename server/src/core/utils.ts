import { randomBytes } from 'crypto';

export function generateId() {
    return randomBytes(16).toString('hex');
}
