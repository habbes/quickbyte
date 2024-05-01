import { randomBytes } from 'crypto';
import { createAppError, createInvalidAppStateError, rethrowIfAppError } from './error.js';
import * as bcrypt from "bcrypt";

export function generateId() {
    return randomBytes(16).toString('base64url');
}


export async function wrapError<T>(fn: () => Promise<T>): Promise<T> {
    try {
        const result = await fn();
        return result;
    } catch (e: any) {
        rethrowIfAppError(e);
        throw createAppError(e);
    }
}

/**
 * Verifies that the collection only has a single item and
 * returns that item, otherwise throws an `invalidAppState` error.
 * @param collection 
 */
export function ensureSingle<T>(collection: T[]): T {
    if (collection.length !== 1) {
        throw createInvalidAppStateError(`Expected collection to have a single item, but had ${collection.length}`);
    }

    return collection[0];
}

/**
 * Verifies that the collection has 0 or a single item. If it has
 * 0 items, undefined is returned, if it has a single item, that item
 * is returned, otherwise throws an `invalidAppState` error.
 * @param collection 
 */
export function ensureSingleOrEmpty<T>(collection: T[]): T|undefined {
    if (collection.length === 0) {
        return;
    }

    return ensureSingle(collection);
}

/**
 * Asserts that a value is not null/undefined and returns it, otherwise
 * throws an `invalidAppState` error.
 * @param value 
 */
export function ensure<T>(value: T|null|undefined, errorMessage?: string): T {
    if (value === null || value === undefined) {
        throw createInvalidAppStateError(errorMessage || `Expected value to be set but was null or undefined`);
    }

    return value;
}

export function hashPassword(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, 10);
}

export function verifyPassword(plaintext: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hashed);
}