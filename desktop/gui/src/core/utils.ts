import { AppInfo, OsInfo, OsType, TransferJob } from "./types";

export function getTransferCompletedSize(transfer: TransferJob) {
    return transfer.files.reduce((sizeSoFar, file) => sizeSoFar + file.completedSize, 0);

    return 0;
}

/**
 * Returns the path of the folder that contains all the provided input paths, i.e.
 * the path to the folder that's the nearest common ancenstor to all the input paths.
 * @param paths 
 * @param separator 
 * @param rootPath 
 */
export function findCommonBasePath(paths: string[], separator = "/", rootPath = ""): string {
    const pathsWithSegments = paths.map(p => p.split(separator));
    const basePathSegments = findCommonBasePathSegments(pathsWithSegments, rootPath);
    return basePathSegments.join(separator);
}

function findCommonBasePathSegments(paths: string[][], rootPath = ""): string[] {
    if (!paths.length) {
        return [rootPath];
    }

    if (paths.length === 1) {
        return paths[0];
    }


    const minLength = Math.min(paths[0].length, paths[1].length);
    let lastCommonIndex = -1;
    for (let i = 0; i < minLength; i++) {
        if (paths[0][i] !== paths[1][i]) {
            break;
        }

        lastCommonIndex = i;
    }

    if (lastCommonIndex === -1) {
        return [rootPath];
    }

    const basePath = paths[0].slice(0, lastCommonIndex + 1);
    // TODO: this is inefficient, unnecessary array allocations and copies
    return findCommonBasePathSegments([basePath, ...paths.slice(2)]);
}

export function computeUserAgent(app: AppInfo, os: OsInfo) {
    return `quickbyte-app=desktopTransfer;version=${app.version};os-type=${os.type};os-platform=${os.platform};os-arch=${os.arch};os-version=${os.version}`;
}

export function disableDefaultContextMenuInReleaseMode() {
    // borrowed from: https://github.com/tauri-apps/wry/issues/30
    // console.log('window.location.hostname', window.location.hostname);
    // alert(window.location.hostname);
    if (window.location.hostname !== 'tauri.localhost') {
        return
    }

    document.addEventListener('contextmenu', e => {
        e.preventDefault();
        return false;
    }, { capture: true })

    document.addEventListener('selectstart', e => {
        e.preventDefault();
        return false;
    }, { capture: true })
}

export function getSystemFileExplorerName(osType: OsType) {
    switch (osType) {
        case 'Darwin':
            return 'Finder';
        case 'Windows_NT':
            return 'File Explorer';
        case 'Linux':
            return 'Files'
    }
}
