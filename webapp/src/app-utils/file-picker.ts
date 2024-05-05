import { ref, computed, type Ref } from 'vue';
import { useFileDialog, useDropZone as useDropZoneCore } from '@vueuse/core';
import { TaskTracker } from "@quickbyte/common";
import { logger } from './logger';

type FilesSelectedHandler = (files: FilePickerEntry[], directories: DirectoryInfo[]) => unknown;

export function useFilePicker() {
    const files = ref<Map<string, FilePickerEntry>>(new Map());
    const directories = ref<Map<string, DirectoryInfo>>(new Map());
    const fileDialog = useFileDialog({ multiple: true });
    let errorHandler: ((e: Error) => unknown) | undefined = undefined;
    // handler called when files have been selected and the picker closed
    // this is useful when the caller isn't interested in the individual file changes within the list
    // but wants to react immediately when a set of files have been selected by the picker
    let filesSelectedHandler: FilesSelectedHandler | undefined = undefined;

    function triggerFileSelectedHandler() {
        filesSelectedHandler && filesSelectedHandler(Array.from(files.value.values()), Array.from(directories.value.values()));
    }

    const raiseDuplicateError = () => {
        if (errorHandler) {
            errorHandler(new Error("We cannot upload multiple files with the same name. Please rename and try again."));
        }
    };

    const openFilePicker = fileDialog.open;
    fileDialog.onChange(fileList => {
        if (!fileList) return;
    
        let duplicatesFound = false;
        for (const file of fileList) {
            if (files.value.has(file.name)) {
                duplicatesFound = true;
                continue;
            }

            files.value.set(file.name, { path: file.name, file });
        }

        if (duplicatesFound) {
            raiseDuplicateError();
        }

        // TODO: should we trigger file selection handler even after error was raised
        triggerFileSelectedHandler();
    });
    const directoryPickerSupported = isDirectoryPickerSupported();
    const openDirectoryPicker = () => {
        openDirectoryPickerAndGetFiles().then(dirFiles => {
            if (!dirFiles) return;
            if (directories.value.has(dirFiles.dirInfo.name)) {
                raiseDuplicateError();
                return;
            }

            directories.value.set(dirFiles.dirInfo.name, dirFiles.dirInfo);
            for (const file of dirFiles.files) {
                files.value.set(file.path, file);
            }

            triggerFileSelectedHandler();
        })
        .catch(e => {
            if (e.name === 'AbortError') {
                return;
            }

            errorHandler && errorHandler(e);
        });
    }

    const reset = () => {
        files.value = new Map();
        directories.value = new Map();
        fileDialog.reset();
    };

    const onError = (fn: (e: Error) => unknown) => {
        errorHandler = fn;
    };

    const onFilesSelected = (handler: FilesSelectedHandler) => {
        filesSelectedHandler = handler;
    };

    const getFileByPath = (path: string) => files.value.get(path);
    const getDirectoryByName = (name: string) => directories.value.get(name);

    const removeFile = (path: string) => {
        files.value.delete(path);
    }

    const removeDirectory = (name: string) => {
        const directoryPrefix = `${name}/`;
        const allFilePaths = files.value.keys();
        for (const path of allFilePaths) {
            if (path.startsWith(directoryPrefix)) {
                files.value.delete(path);
            }
        }

        directories.value.delete(name);
    }

    function addFileSystemEntry(fsEntry: FileSystemEntry, taskTracker: TaskTracker, path: string = "") {
        if (fsEntry?.isFile) {
            const fileEntry = fsEntry as FileSystemFileEntry;
            // We call startTask before (and outside) the async callbacks
            // to ensure that by the time this method returns, all tasks
            // will have been started, so the caller will be safe to signal
            // no more tasks
            taskTracker.startTask();
            fileEntry.file((file: File) => {
                const fullName = path ? `${path}/${file.name}` : file.name;
                files.value.set(fullName, { path: fullName, file });
                taskTracker.completeTask();
            }, (error) => {
                logger.error(`Failed to get dropped file from FileSystemEntry ${error}`),
                errorHandler && errorHandler(error);
                taskTracker.completeTask();
            });
        }
        else if (fsEntry?.isDirectory) {
            const dirReader = (fsEntry as FileSystemDirectoryEntry).createReader();
            directories.value.set(fsEntry.name, { name: fsEntry.name, totalFiles: 0, totalSize: 0 });
            taskTracker.startTask();
            dirReader.readEntries((dirEntries) => {
                for (let dirEntry of dirEntries) {
                    addFileSystemEntry(dirEntry, taskTracker, path ? `${path}/${fsEntry.name}` : fsEntry.name);
                }

                taskTracker.completeTask();
            }, (error) => {
                logger.error(`Failed to read directory entries`);
                errorHandler && errorHandler(error);
                taskTracker.completeTask();
            });
        }
    }

    async function onDrop(droppedFiles: File[]|null, event: DragEvent) {
        if (!droppedFiles) return;
        if (!droppedFiles.length) return;

        // see: https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/webkitGetAsEntry
        if (event.dataTransfer?.items) {
            logger.log(`Using DragEvent.dataTransfer API to frop files`);
            const fileTasksTracker = new TaskTracker(logger);
            for (let item of event.dataTransfer.items) {
                // TODO: we should also support folders
               
                const fsEntry = item.webkitGetAsEntry();
                if (fsEntry) {
                    addFileSystemEntry(fsEntry, fileTasksTracker);
                }
                else {
                    logger.error(`Unable to read FileSystemEntry from DataTransferItem using item.webkitGetAsEntry`);
                }
            }

            fileTasksTracker.signalNoMoreTasks();
            try {
                await fileTasksTracker.waitForTasksToComplete();
            } catch (e: any) {
                errorHandler && errorHandler(e);
            }
        } else {
            logger.warn(`Does not support DragEvent.dataTransfer API, falling back to standard File API`)
            for (let file of droppedFiles) {
                if (!file.type) {
                    // TODO: folders don't have a type, so this could be a folder.
                    // But it could also be a file with an unknown type
                    // For now I just ignore it cause it will cause error when
                    // we try to "read" a folder during a upload.
                    logger.warn(`Skipping file '${file.name}' of unknown type. Could be a folder.`)
                    return;
                }
    
                files.value.set(file.name, { path: file.name, file });
            }
        }

        triggerFileSelectedHandler();
    }

    const useDropZone = (element: Ref<HTMLElement|undefined>) => {
        const { isOverDropZone } = useDropZoneCore(element, {
            onDrop
        });

        return { isOverDropZone };
    }

    return {
        files: computed(() => Array.from(files.value.values())),
        directories: computed(() => Array.from(directories.value.values())),
        openFilePicker,
        openDirectoryPicker,
        reset,
        onError,
        getFileByPath,
        getDirectoryByName,
        removeFile,
        removeDirectory,
        /**
         * Set handler to be called when the user has
         * finished selecting files or folders in the picker.
         * @param handler 
         */
        onFilesSelected,
        /**
         * Lets you add file drag-and-drop support and automatically
         * add dropped files to the files list and trigger the
         * onFilesSelected handler
         */
        useDropZone,
        directoryPickerSupported
    }
}

export function isDirectoryPickerSupported() {
    return 'showDirectoryPicker' in window && window.self === window.top;
}

async function openDirectoryPickerAndGetFiles() {
    if (!isDirectoryPickerSupported()) return;
    // @ts-ignore
    const dirHandle: FileSystemDirectoryHandle = await showDirectoryPicker();
    const files = await getFiles(dirHandle);
    const dirInfo: DirectoryInfo = {
        totalFiles: files.length,
        totalSize: files.reduce((sizeSoFar, f) => sizeSoFar + f.file.size, 0),
        name: dirHandle.name
    }

    return {
        files,
        dirInfo
    };
}

async function getFiles(dir: FileSystemDirectoryHandle, path: string = dir.name) {
    const dirs: Promise<FilePickerEntry[]>[] = [];
    const files: Promise<FilePickerEntry>[] = [];

    // @ts-ignore
    for await (const entry of dir.values()) {
        const entryPath = `${path}/${entry.name}`;
        if (entry.kind === 'file') {
            // @ts-ignore
            files.push(entry.getFile().then(file => {
                return { path: entryPath, file }
            }));
        } else if (entry.kind === 'directory') {
            dirs.push(
                getFiles(
                    entry as FileSystemDirectoryHandle,
                    entryPath
                )
            );
        }
    }

    return [
        ...(await Promise.all(dirs)).flat(),
        ...(await Promise.all(files))
    ]
}

export interface DirectoryInfo {
    name: string;
    totalFiles: number;
    totalSize: number;
}

export interface FilePickerEntry {
    path: string;
    file: File;
}
