import { TransferFile } from "./models.js";

export async function executeTasksInBatches<TSource, TResult>(
    source: TSource[],
    createTask: (s: TSource) => Promise<TResult>,
    numWorkers: number
): Promise<TResult[]> {
    const result = new Array<TResult>(source.length);
    const workers = new Array<Promise<void>>(numWorkers);
    for (let w = 0; w < numWorkers; w++) {
        workers[w] = executeBatchWorker(w, numWorkers, source, createTask, result);
    }

    await Promise.all(workers);
    return result;
}

async function executeBatchWorker<TSource, TResult>(
    startIndex: number,
    numWorkers: number,
    taskSources: TSource[],
    createTask: (s: TSource) => Promise<TResult>,
    results: TResult[]
) {
    let nextTaskIndex = startIndex;
    while (nextTaskIndex < taskSources.length) {
        const result = await createTask(taskSources[nextTaskIndex]);
        results[nextTaskIndex] = result;
        nextTaskIndex += numWorkers;
    }
}

/**
 * Gets the folder path from the specified qualified file name.
 * If the provided file path does not include an enclosing
 * folder segment, then an empty string is returned.
 * @param filePath 
 * @example getFolderPath("Music/Artists/Habbes/Sema.mp3") => "Music/Artists/Habbes"
 * @example getFolderPath("Sema.mp3") => ""
 */
export function getFolderPath(filePath: string) {
    const sepIndex = filePath.lastIndexOf('/');
    return sepIndex === -1 ? "" : filePath.substring(0, sepIndex);
}

export function splitFilePathAndName(filePath: string) {
    const sepIndex = filePath.lastIndexOf('/');
    if (sepIndex === -1) {
        return {
            folderPath: "",
            fileName: filePath
        }
    } else {
        return {
            folderPath: filePath.substring(0, sepIndex),
            fileName: filePath.substring(sepIndex + 1)
        }
    }
}

export function escapeRegExp(value: string) {
    // see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export function getFileExtension(fileName: string) {
    return fileName.split('.').at(-1);
}

export function getBlobName(file: TransferFile) {
    return `${file.transferId}/${file._id}`;
}

export function getFileName(file: TransferFile) {
    const fileName = file.name.split('/').at(-1) || file._id;
    return fileName;
}

const EMAIL_REGEX = /^[^@,;\s]+@[^@,;\s]+\.[^@,;\s]+$/;
export function isEmail(value: string) {
    return EMAIL_REGEX.test(value);
}

export function unwrapSingleton<T>(value: T | T[]): T {
    const singleton = unwrapSingletonOrUndefined(value);
    return ensure(singleton);
}

export function unwrapSingletonOrUndefined<T>(value: T | T[] | undefined): T|undefined {
    return Array.isArray(value) ? value[0] : value;
}

export function ensure<T>(obj?: T|undefined|null, message?: string): T {
    if (!obj) throw new Error(message || 'Expected object to be defined.');
    return obj;
}

export function humanizeSize(bytes: number): string {
    const BYTES_PER_KB = 1024;
    const BYTES_PER_MB = 1024 * 1024;
    const BYTES_PER_GB = 1024 * 1024 * 1024;
    const BYTES_PER_TB = 1024 * BYTES_PER_GB;

    if (bytes < BYTES_PER_KB) {
        return `${bytes} Bytes`;
    }

    if (bytes < BYTES_PER_MB) {
        const kbs = Math.ceil(bytes / BYTES_PER_KB);
        return `${kbs} KB`;
    }

    if (bytes < BYTES_PER_GB) {
        const mbs = Math.ceil(bytes / BYTES_PER_MB);
        return `${mbs} MB`;
    }

    if (bytes < BYTES_PER_TB) {
        const gbs = (bytes / BYTES_PER_GB).toLocaleString(undefined, { maximumFractionDigits: 2 });
        return `${gbs} GB`;
    }

    const tbs = (bytes / BYTES_PER_TB).toLocaleString(undefined, { maximumFractionDigits: 2 });;
    return `${tbs} TB`;
}

export function formatPercentage(value: number, total: number, decimals: number = 2) {
    const percent = 100 * value / total;
    const formatted = `${percent.toFixed(decimals)}%`;
    return formatted;
}

export function pluralize(word: string, count: number, plural: string = '') {
    plural = plural || `${word}s`;
    // TODO handle special cases (e.g. directory -> directories)
    return count == 1 ? word : plural;
}
