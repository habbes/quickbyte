import { ref, type Ref } from "vue";
import { apiClient, store, uploadRecoveryManager, logger, windowUnloadManager, type FilePickerEntry, type DirectoryInfo, taskManager } from '@/app-utils';
import { ensure, ApiError, AzUploader, MultiFileUploader, type CreateTransferResult, type Media, type TransferTask, pluralize } from "@/core";

type UploadState = 'initial' | 'fileSelection' | 'progress' | 'complete' | 'error';

export function startFileTransfer(args: StartFileTransferArgs): StartTransferResultTrackers {
    const uploadProgress = ref(0);
    const uploadState = ref<UploadState>('initial');
    const transfer = ref<CreateTransferResult>();
    const media = ref<Media[]>();
    const error = ref<Error>();
    const downloadUrl = ref<string>();

    const result = {
        uploadProgress,
        uploadState,
        transfer,
        media,
        error,
        downloadUrl
    };

    startFileTransferInternal(args, result);

    return result;
}

export function useFileTransfer() {
    const uploadProgress = ref(0);
    const uploadState = ref<UploadState>('initial');
    const transfer = ref<CreateTransferResult>();
    const media = ref<Media[]>();
    const error = ref<Error>();
    const downloadUrl = ref<string>();

    const result = {
        uploadProgress,
        uploadState,
        transfer,
        media,
        error,
        downloadUrl
    };

    const startTransfer = (args: StartFileTransferArgs) => startFileTransferInternal(args, result);

    return { ...result, startTransfer };
}

async function startFileTransferInternal(args: StartFileTransferArgs, result: StartTransferResultTrackers) {
    const { files, directories } = args;
    const { uploadProgress, uploadState, media, transfer, downloadUrl, error } = result;
    uploadProgress.value = 0;
    downloadUrl.value = undefined;
    uploadState.value = 'progress';
    const started = new Date();
    const blockSize = 16 * 1024 * 1024; // 16MB

    const removeExitWarning = windowUnloadManager.warnUserOnExit();
    const task: TransferTask = taskManager.createTask({
        status: 'pending',
        description: `Uploading ${files.length} ${pluralize('file', files.length)}`,
        type: 'transfer'
    });

    try {
        const user = ensure(store.userAccount.value, 'No active user found to execute media upload.');
        const provider = ensure(store.preferredProvider.value, 'Preferred provider not set for media upload.');

        const totalSize = files.reduce((sizeSoFar, f) => sizeSoFar + f.file.size, 0);

        if ('projectId' in args) {
            const uploadResult = await apiClient.uploadProjectMedia(user.account._id, args.projectId, {
                provider: provider.provider,
                region: provider.bestRegions[0],
                files: files.map(f => ({ name: f.path, size: f.file.size })),
                meta: {
                    ip: store.deviceData.value?.ip,
                    countryCode: store.deviceData.value?.countryCode,
                    userAgent: store.deviceData.value?.userAgent
                }
            });

            transfer.value = uploadResult.transfer;
            media.value = uploadResult.media;
        } else {
            transfer.value = await apiClient.createTransfer(user.account._id, {
                name: args.name,
                provider: provider.provider,
                region: provider.bestRegions[0],
                files: files.map(f => ({ name: f.path, size: f.file.size })),
                meta: {
                    ip: store.deviceData.value?.ip,
                    countryCode: store.deviceData.value?.countryCode,
                    userAgent: store.deviceData.value?.userAgent
                }
            });
        }

        task.transfer = transfer.value;
        task.status = 'progress';

        const transferTracker = uploadRecoveryManager.createTransferTracker({
            name: transfer.value.name,
            id: transfer.value._id,
            totalSize: totalSize,
            blockSize,
            files: transfer.value.files.map(f => ({ size: f.size, path: f.name })),
            directories: directories.map(d => ({ totalFiles: d.totalFiles, totalSize: d.totalSize, name: d.name }))
        });

        const uploader = new MultiFileUploader({
            files: transfer.value.files,
            onProgress: (progress) => {
                uploadProgress.value = progress,
                task.progress = 100 * progress / totalSize;
            },
            uploaderFactory: (file, onFileProgress, fileIndex) => {
                if (!files) throw new Error("Excepted files.value to be set");

                const fileToTrack = ensure(
                    transfer.value?.files.find(f => f.name === files[fileIndex].path),
                    `Cannot find file '${files[fileIndex].path}' in transfer package.`);

                return new AzUploader({
                    file: files[fileIndex].file,
                    blockSize,
                    uploadUrl: file.uploadUrl,
                    tracker: transferTracker.createFileTracker({
                        blockSize,
                        id: fileToTrack._id,
                        filename: fileToTrack.name,
                        size: fileToTrack.size
                    }),
                    onProgress: onFileProgress,
                    logger,
                    concurrencyStrategy: transfer.value?.files.length === 1 ? 'maxParallelism' : 'fixedWorkers'
                })
            }
        });

        await uploader.uploadFiles();

        const stopped = new Date();
        logger.log(`full upload operation took ${stopped.getTime() - started.getTime()}`);

        let retry = true;
        while (retry) {
            try {
                const download = await apiClient.finalizeTransfer(user.account._id, transfer.value._id, {
                    duration: stopped.getTime() - started.getTime(),
                    recovered: false
                });
                retry = false;
                downloadUrl.value = `${location.origin}/d/${download._id}`;
                uploadState.value = 'complete';
                logger.log(`full operation + download link took ${(new Date()).getTime() - started.getTime()}`);
            } catch (e) {
                if (e instanceof ApiError) {
                    // Do not retry on ApiError since it's not a network failure.
                    // TODO: handle this error some other way, e.g. alert message
                    retry = false;
                    error.value = e;
                    logger.error(e.message, e);
                } else {
                    logger.error('Error fetching download', e);
                    retry = true;
                }
            }
        }

        task.status = 'complete';
        await transferTracker.completeTransfer(); // we shouldn't block for this, maybe use promise.then?
    } catch (e: any) {
        logger.error(e.message, e);
        uploadState.value = 'initial';
        error.value = e
        task.status = 'error';
        task.error = e.message;
    }
    finally {
        removeExitWarning();
    }
}

interface StartFileTransferBaseArgs {
    files: FilePickerEntry[],
    directories: DirectoryInfo[]
}

interface StartShareableFileTransferArgs extends StartFileTransferBaseArgs {
    name: string;
}

interface StartProjectMediaTransferArgs extends StartFileTransferBaseArgs {
    projectId: string;
}

export type StartFileTransferArgs = StartShareableFileTransferArgs | StartProjectMediaTransferArgs;

interface StartTransferResultTrackers {
    uploadProgress: Ref<number>;
    uploadState: Ref<UploadState>;
    downloadUrl: Ref<string | undefined>;
    transfer: Ref<CreateTransferResult | undefined>;
    media: Ref<Media[] | undefined>;
    error: Ref<Error | undefined>;
}