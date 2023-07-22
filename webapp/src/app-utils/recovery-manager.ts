import { UploadRecoveryManager } from '@/core';
import { store } from './store';

export const uploadRecoveryManager = new UploadRecoveryManager({
    onClear() {
        store.recoveredUploads.value = [];
    },
    onDelete(id: string) {
        store.recoveredUploads.value = store.recoveredUploads.value.filter(u => u.id !== id)
    }
});

uploadRecoveryManager.init(); // this is async, but we don't want to block