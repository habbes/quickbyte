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
