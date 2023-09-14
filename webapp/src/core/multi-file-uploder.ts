import { executeTasksInBatches } from ".";

export class MultiFileUploader {
    private totalProgress: number = 0;
    private progresses: number[];
    private uploaders: (IUploader|null)[];

    constructor(private config: MultiFileUploaderArgs) {
        this.progresses = new Array(this.config.files.length);
        this.progresses.fill(0);
        
        // TODO: it's bad design to rely on the index to identify files
        // We should use the name and id. That'll save us the need
        // to create an array with an entry for each file, we should
        // be able to create a collection that excludes completed files.
        // This is also error-prone because it requires all related
        // collections to have the same ordering of files.
        this.uploaders = this.config.files.map((file, index) => {
            if (this.config.completedFiles?.get(file.name)) {
                this.updateFileProgress(index, file.size);
                return null;
            }
            
            const fileIndex = index;
            return this.config.uploaderFactory(
                file,
                (fileProgress) => this.updateFileProgress(fileIndex, fileProgress),
                fileIndex
            );
        });
    }

    async uploadFiles(): Promise<void> {
        // await executeTasksInBatches(
        //     this.uploaders.filter(u => !!u),
        //     u => u!.uploadFile(),
        //     6
        // )
        // using Promise.all seems to be faster than creating fixed workers
        // seems the browser is smart enough to automatically limit the number
        // of parallel uploads
        // TODO: test how well this works on a slower network
        // await Promise.all(this.uploaders.filter(u => u).map(u => u?.uploadFile()));
        // using Promise.all doesn't work for huge number of tasks, so for now
        // we just limit to a high number of concurrent workers
        await executeTasksInBatches(
            this.uploaders.filter(u => !!u),
            u => u!.uploadFile(),
            16
        );
    }

    private updateFileProgress(fileIndex: number, fileProgress: number) {
        this.totalProgress -= this.progresses[fileIndex];
        this.totalProgress += fileProgress;
        this.progresses[fileIndex] = fileProgress;
        this.config.onProgress(this.totalProgress);
    }
}

export interface MultiFileUploaderArgs {
    files: FileItem[],
    completedFiles?: Map<string, { filename: string }>,
    uploaderFactory: (file: FileItem, onFileProgress: (p: number) => unknown, fileIndex: number) => IUploader,
    onProgress: (progress: number) => unknown
}

interface FileItem {
    size: number;
    name: string;
    uploadUrl: string;
}

export interface IUploader {
    uploadFile(): Promise<void>;
}