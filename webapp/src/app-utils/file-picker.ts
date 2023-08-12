import { ref, readonly } from 'vue';
import { useFileDialog } from '@vueuse/core';

export function useFilePicker() {
    const files = ref<FilePickerEntry[]|null>(null);
    const directories = ref<Map<string, DirectoryInfo>>(new Map());
    const fileDialog = useFileDialog({ multiple: true });

    const openFilePicker = fileDialog.open;
    fileDialog.onChange(fileList => {
        if (!fileList) return;
        const selectedFiles = Array.from(fileList).map(f => ({ path: f.name, file: f }));
        files.value = (files.value||[]).concat(selectedFiles);
    });
    const directoryPickerSupported = isDirectoryPickerSupported();
    const openDirectoryPicker = () => {
        openDirectoryPickerAndGetFiles().then(dirFiles => {
            if (!dirFiles) return;
            directories.value.set(dirFiles.dirInfo.name, dirFiles.dirInfo);
            files.value = [...(files.value || []), ...dirFiles.files]
        });
    }

    const reset = () => {
        files.value = null;
        directories.value = new Map();
        fileDialog.reset();
    };

    return {
        files: readonly(files),
        directories: readonly(directories),
        openFilePicker,
        openDirectoryPicker,
        reset,
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

