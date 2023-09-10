import { ref, computed } from 'vue';
import { useFileDialog } from '@vueuse/core';

export function useFilePicker() {
    const files = ref<Map<string, FilePickerEntry>>(new Map());
    const directories = ref<Map<string, DirectoryInfo>>(new Map());
    const fileDialog = useFileDialog({ multiple: true });
    let errorHandler: ((e: Error) => unknown) | undefined = undefined;

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
    }

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

interface DirectoryInfo {
    name: string;
    totalFiles: number;
    totalSize: number;
}

export interface FilePickerEntry {
    path: string;
    file: File;
}

