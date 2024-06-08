import { computed, ref } from "vue";

const _isSpaceBarPressed = ref<boolean>(false);

/**
 * Checks whether the space bar key is currently pressed (key down).
 * This checks the document as a whole, not a specific child node.
 */
export const isSpaceBarPressed = computed(() => _isSpaceBarPressed.value);

/**
 * Initializes the space bar listener which will update the
 * `isSpaceBarPressed` value based on the current state of
 * the space bar key. This should be called once on
 * app initialization. It powers features like pressing the space bar
 * to toggle the media player even when the player component is
 * not in focus.
 */
export function initializeSpaceBarWatcher() {
    document.addEventListener('keydown', (event) => {
        if (event.key === ' ') {
            _isSpaceBarPressed.value = true;
        }
    });

    document.addEventListener('keyup', (event) => {
        if (event.key === ' ') {
            _isSpaceBarPressed.value = false;
        }
    })
}