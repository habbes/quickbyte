import { UploadRecoveryManager } from '@/core';

export const uploadRecoveryManager = new UploadRecoveryManager();

uploadRecoveryManager.init(); // this is async, but we don't want to block