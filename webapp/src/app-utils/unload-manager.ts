
export const windowUnloadManager = createWindowUnloadManager();

function createWindowUnloadManager(): WindowUnloadManager {
    let activeRequests = 0;

    function beforeUnloadEventListener(event: Event) {
        event.preventDefault();
        // For compability reasons.
        // See: https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event#compatibility_notes
        // @ts-ignore 
        return (event.returnValue = 'Do you want to leave the site? Changes you made may not be saved.');
    }

    function unsubscribe() {
        activeRequests--;
        if (activeRequests === 0) {
            // We must remove the event handler when there are no unsaved changes
            // Otherwise this page might be inelegible for the bfcache on some browsers
            // and cause perf issues. See: https://web.dev/bfcache/#only-add-beforeunload-listeners-conditionally
            // See also: https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
            window.removeEventListener('beforeunload', beforeUnloadEventListener, { capture: true });
        }
    }

    const warnUserOnExit = () => {
        activeRequests++;

        // We don't need to check if the listener has already been registered
        // addEventListener will not add the listener a second time if it's
        // currently already registered
        window.addEventListener('beforeunload', beforeUnloadEventListener, { capture: true });

        return unsubscribe;
    }

    return {
        warnUserOnExit
    }
}

export interface WindowUnloadManager {
    /**
     * Tells the unload manager to warn the user
     * when they are about to close the browser window.
     * This returns a function that should be called to
     * remove the warning.
     * 
     * For example, if you want the warning to be displayed if a user
     * attempts to close the browser during an upload operation, you
     * should make sure to call the returned function after the upload
     * is complete to avoid displaying the warning when unnecessary.
     * @returns A func
     */
    warnUserOnExit(): UnsubscribeUserCloseWarningCb;
}

type UnsubscribeUserCloseWarningCb = () => unknown;