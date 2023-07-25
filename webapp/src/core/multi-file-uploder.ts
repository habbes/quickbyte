export class MultiFileUploader {
    private totalProgress: number = 0;
    private progresses: number[];
    private uploaders: IUploader[];

    constructor(private config: MultiFileUploaderArgs) {
        this.progresses = new Array(this.config.files.length);
        this.progresses.fill(0);

        this.uploaders = this.config.files.map((file, index) => {
            const fileIndex = index;
            return this.config.uploaderFactory(
                file,
                (fileProgress) => {
                    this.totalProgress -= this.progresses[fileIndex];
                    this.totalProgress += fileProgress;
                    this.progresses[fileIndex] = fileProgress;
                    this.config.onProgress(this.totalProgress);
                },
                fileIndex
            );
        });
    }

    async uploadFiles(): Promise<void> {
        for (let uploader of this.uploaders) {
            await uploader.uploadFile();
        }
    }
}

export interface MultiFileUploaderArgs {
    files: FileItem[]
    uploaderFactory: (file: FileItem, onFileProgress: (p: number) => unknown, fileIndex: number) => IUploader,
    onProgress: (progress: number) => unknown
}

interface FileItem {
    size: number;
    uploadUrl: string;
}

export interface IUploader {
    uploadFile(): Promise<void>;
}