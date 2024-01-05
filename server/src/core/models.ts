import { generateId } from "./utils.js";
import { Principal, PersistedModel } from "@quickbyte/common";
export * from "@quickbyte/common";

export function createPersistedModel(createdBy: Principal | string): PersistedModel {
    const now = new Date();

    const principal: Principal = typeof createdBy === 'string' ? { type: 'user', _id: createdBy } : createdBy;

    return {
        _id: generateId(),
        _createdAt: now,
        _createdBy: principal,
        _updatedAt: now,
        _updatedBy: principal
    }
}
