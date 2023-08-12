import { ref, readonly, computed } from 'vue';
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
        for (let file of fileList) {
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
            for (let file of dirFiles.files) {
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

    return {
        files: computed(() => Array.from(files.value.values())),
        directories: readonly(directories),
        openFilePicker,
        openDirectoryPicker,
        reset,
        onError,
        directoryPickerSupported
    }
}

function isDirectoryPickerSupported() {
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

interface FilePickerEntry {
    path: string;
    file: File;
}

