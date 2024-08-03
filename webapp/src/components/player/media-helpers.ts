export type MediaSource = {
    url: string;
    type: 'hls' | 'dash' | 'raw';
    mimeType?: string;
};

/**
 * Checks whether the media sources have changed. This does not guarantee all the source
 * urls are the same. Instead, it attempts to provide an indiciation of whether the
 * player will need to reload the media if the sources list changed from `previous` to
 * `current`.
 * @param current 
 * @param previous 
 */
export function haveMediaSourcesChanged(current: MediaSource[]|undefined|null, previous: MediaSource[]|undefined|null): boolean {
    if (!current || !previous) return false;
    if (current.length !== previous.length) return false;
    for (let i = 0; i < current.length; i++) {
        const a = current[i];
        const b = previous[i];
        // We usually have hls or dash first in the list as they are the preferred
        // sources for smooth playback. So if we find hls/dash to be equal
        // we consider the media sources equal without checking the rest of the sources
        // because that's what the player will pick.
        const sourcesEqual = areSourcesEqual(a, b);
        if (sourcesEqual && (a.type === 'hls' || a.type === 'dash')) {
            return true;
        } else if (!sourcesEqual) {
            return false;
        }
    }

    return true;
}

function areSourcesEqual(a: MediaSource, b: MediaSource) {
    return a.url === b.url && a.mimeType === b.mimeType && a.type === b.type;
}
