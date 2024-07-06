import { provide, inject, ref, computed } from 'vue'
import type { InjectionKey } from 'vue'

const key = Symbol() as InjectionKey<CanvasController>;

export function provideCanvasController() {
    const controller = new CanvasController();
    provide(key, controller);
    return controller;
}

export function injectCanvasController() {
    return inject(key);
}

export class CanvasController {
    private undoSignal = ref<any>(1);
    private redoSignal = ref<any>(1);

    // producer

    undoShape = () => {
        this.undoSignal.value = (this.undoSignal.value + 1) % 2;
    };

    redoShape = () => {
        this.redoSignal.value = (this.redoSignal.value + 1) % 2;
    };

    // consumer
    

    getUndoSignal = () => computed(() => this.undoSignal.value);

    getRedoSignal = () => computed(() => this.redoSignal.value);

}