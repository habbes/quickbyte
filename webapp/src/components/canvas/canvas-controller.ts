import { provide, inject, ref, computed } from 'vue'
import type { InjectionKey } from 'vue'

const key = Symbol() as InjectionKey<CanvasController>;

// The CanvasController is a poor man's event bus.
// The rationale is to create a bridge that makes it easy
// to perform operations like undo on the canvas, without
// having to manually propage a ref of the AnnotationsCanvas
// component instance up through layers of parent components.
// That would be annoying and messy, especially given that
// multiple instances of the canvas are nested in multiple viewers.
// That said, the design here also feels hacky and possibly
// an anti-pattern. The use of refs with dummy data and using
// watch to listen for events feels hacky.

/**
 * Creates and provides a canvas controller
 * that can be used to interact and manipulate directly any
 * downstream `AnnotationsCanvas` component.
 * If there are multiple downstream canvas instances,
 * each of them will handle the requested operations
 * independently.
 */
export function provideCanvasController() {
    const controller = new CanvasController();
    provide(key, controller);
    return controller;
}

/**
 * Inject a canvas controller from an ancestor components
 * that wants to manipulate the canvas directly.
 * This should be called from within a `AnnotationsCanvas` component.
 */
export function injectCanvasController() {
    return inject(key);
}

export class CanvasController {
    // I'm using ref to implement the event handlers cause I'm not
    // sure of an easier way to do this in vue.
    // I also don't want to create custom onRedo(handlerDelegate) functions
    // because I would have to clean up the event handlers manually
    // when components are unmounted, it would also just be more work.
    // By using "watch" to listen to events in the canvas components,
    // I'm expecting vue to automatically clean up the watchers when
    // the components are unmounted. But I have not verified that actually
    // happens. I should verify that to avoid potential leaks.
    private undoSignal = ref<any>(1);
    private redoSignal = ref<any>(1);

    // producer
    /**
     * Request the downstream canvas to undo the last shape.
     */
    undoShape = () => {
        // pass a dummy value to the ref to trigger listeners
        // that are watching the signal
        this.undoSignal.value = (this.undoSignal.value + 1) % 2;
    };

    /**
     * Request the downstream canvas to redo the last shape.
     */
    redoShape = () => {
        // pass dummy value to trigger event
        this.redoSignal.value = (this.redoSignal.value + 1) % 2;
    };

    // consumer
    /**
     * Returns a signal that will be triggered whenever an undo
     * operation is requested by the controller.
     * Use `watch` to listen to events. Do not read the value
     * of the signal.
     */
    getUndoSignal = () => computed(() => this.undoSignal.value);

    /**
     * Returns a signla that will be triggered whenever a redo
     * operation is requested by the controller.
     * Use `watch` to listen to events. Do not read the value
     * of the signal.
     */
    getRedoSignal = () => computed(() => this.redoSignal.value);
}
