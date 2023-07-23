import { UploadRecoveryManager } from '@/core';
import { store } from './store';
import { logger } from './logger';

export const uploadRecoveryManager = new UploadRecoveryManager({
    onClear() {
        store.recoveredUploads.value = [];
    },
    onDelete(id: string) {
        store.recoveredUploads.value = store.recoveredUploads.value.filter(u => u.id !== id)
    },
    logger
});

uploadRecoveryManager.init(); // this is async, but we don't want to block