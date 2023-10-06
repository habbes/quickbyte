import { ref } from 'vue';

const TOAST_TIMEOUT_MS = 5000;

export const toasts = ref<Toast[]>([]);

let nextToastId = 1;

export function showToast(message: string, type: MessageType) {
    const id = nextToastId++;
    toasts.value.push({ message, type, id });
    setTimeout(() => {
        toasts.value = toasts.value.filter(t => t.id !== id);
    }, TOAST_TIMEOUT_MS);
}

export type MessageType = 'info' | 'error' | 'success';

export interface Toast {
    message: string;
    type: MessageType;
    id: string|number;
}