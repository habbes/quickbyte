use crate::core::models::JobStatus;
use azure_storage_blobs::{
    blob::{BlobBlockType, BlockList},
    prelude::BlobClient,
};
use std::{sync::Arc, time::Instant};
use url::Url;

use super::{
    dtos::*,
    error::*,
    message_channel::MessageChannel,
    transfer_queue::{
        BlockTransferQueue, BlockTransferRequest, BlockTransferUpdate, BlockUploadRequest,
    },
};

pub struct TransferUploader<'a> {
    request: &'a TransferJob,
    transfer_queue: Arc<BlockTransferQueue>,
}

impl<'a> TransferUploader<'a> {
    pub fn new(request: &TransferJob, transfer_queue: Arc<BlockTransferQueue>) -> TransferUploader {
        TransferUploader {
            request,
            transfer_queue,
        }
    }

    pub async fn start_upload(&self, events: Arc<MessageChannel<TransferUpdate>>) {
        let mut dispatchers = vec![];
        let mut watchers = vec![];
        for file in &self.request.files {
            if file.status == JobStatus::Pending || file.status == JobStatus::Progress {
                match init_file_upload(
                    self.request._id.clone(),
                    file.clone(),
                    self.transfer_queue.clone(),
                    events.clone()) {
                    
                    Ok((dispatcher, watcher)) => {
                        dispatchers.push(dispatcher);
                        watchers.push(watcher);
                    },
                    Err(err) => {
                        events.send(TransferUpdate::FileFailed {
                            file_id: file._id.clone(),
                            transfer_id: self.request._id.clone(),
                            error: err.to_string()
                        }).await;

                        return;
                    }

                }
            }
        }

        let count = dispatchers.len();
        println!("Start uploading {count} files");
        let timer = Instant::now();

        // create a single task for all dispatchers because
        // we want block download jobs to be dispatched sequentially
        // and downloaded concurrently, but in the file order
        // so that we can prioritize completing a few files before
        // starting others
        let mut tasks = vec![];
        tasks.push(tokio::spawn(async move {
            for dispatcher in dispatchers {
                dispatcher.queue_file().await;
            }
        }));

        // create a task by watcher because it's possible
        // that one file could start sending progress updates
        // before another file has complted
        for watcher in watchers {
            tasks.push(tokio::spawn(async move {
                watcher.wait_upload_complete().await;
            }))
        }

        println!("Transfer uploader waiting for file jobs to complete");
        for task in tasks {
            task.await.expect("Failed to complete file upload task");
        }

        println!(
            "Finished uploading {} files in {}s",
            count,
            timer.elapsed().as_secs_f64()
        );

        events
            .send(TransferUpdate::TransferCompleted {
                transfer_id: self.request._id.clone(),
            })
            .await;
    }
}

fn init_file_upload(
    transfer_id: String,
    file_job: TransferJobFile,
    transfer_queue: Arc<BlockTransferQueue>,
    events: Arc<MessageChannel<TransferUpdate>>
) -> Result<(FileUploadBlockDispatcher, FileUploadCompletionWatcher), AppError> {

    let url = Url::parse(&file_job.remote_url)
        .or(Err(AppError::General("invalid file upload URL".into())))?;

    let blob_client =
        BlobClient::from_sas_url(&url)
        // TODO: should map Azure Error to AppError via From, but compiler fails for some reason
        .map_err(|e|AppError::Transfer("Failed to create client".into()))
        .map(Arc::new)?;

    let (file_started_tx, file_started_rx) = tokio::sync::oneshot::channel();
    let (update_tx, update_rx) = tokio::sync::mpsc::channel(file_job.blocks.len());

    let file_job = Arc::new(file_job);
    let dispatcher = FileUploadBlockDispatcher {
        file_job: file_job.clone(),
        transfer_queue: transfer_queue.clone(),
        update_tx,
        blob_client: blob_client.clone(),
        file_started_tx
    };

    let watcher = FileUploadCompletionWatcher {
        file_job: file_job.clone(),
        transfer_id: transfer_id,
        update_rx,
        file_started_rx,
        events,
        blob_client
    };

    Ok((dispatcher, watcher))
}

#[derive(Debug)]
struct FileUploadBlockDispatcher {
    file_job: Arc<TransferJobFile>,
    transfer_queue: Arc<BlockTransferQueue>,
    update_tx: tokio::sync::mpsc::Sender<BlockTransferUpdate>,
    file_started_tx: tokio::sync::oneshot::Sender<FileUploadStartedMessage>,
    blob_client: Arc<BlobClient>,
}

#[derive(Debug)]
struct FileUploadCompletionWatcher {
    file_job: Arc<TransferJobFile>,
    transfer_id: String,
    update_rx: tokio::sync::mpsc::Receiver<BlockTransferUpdate>,
    file_started_rx: tokio::sync::oneshot::Receiver<FileUploadStartedMessage>,
    events: Arc<MessageChannel<TransferUpdate>>,
    blob_client: Arc<BlobClient>,
}

#[derive(Debug)]
struct FileUploadStartedMessage {
    started_at: std::time::Instant,
}

impl FileUploadBlockDispatcher {
    pub async fn queue_file(self) {
        println!("Uploading file {}", self.file_job.name);

        let file = Arc::new(
            std::fs::File::open(&self.file_job.local_path)
                .expect("Failed to open local file for download"),
        );

        // technically, this doesn't indicate when the file upload starts,
        // but when the file queueing start. To track file start,
        // we should trigger this after the first block is queue.
        self.file_started_tx.send(FileUploadStartedMessage {
            started_at: std::time::Instant::now()
        }).expect("Failed to send file upload started event.");

        let file_job = self.file_job.clone();

        let blob_client = self.blob_client.clone();
        tokio::spawn(async move {
            for block in &file_job.blocks {
                if block.status == JobStatus::Completed {
                    continue;
                }

                let chunk_size = file_job.chunk_size;
                let offset = block.index * chunk_size;
                let end = std::cmp::min(offset + chunk_size, file_job.size);
                let real_size = end - offset;

                println!(
                    "Sent block {} of file {} to queue",
                    block.index, file_job.name
                );
                // Since the transfer queue is bounded, the task might block at this point until
                // some items in the queue have completed their transfer
                self.transfer_queue
                    .send(BlockTransferRequest::Upload(Box::new(BlockUploadRequest {
                        block: block.clone(),
                        offset: offset,
                        size: real_size,
                        file: Arc::clone(&file),
                        client: blob_client.clone(),
                        update_channel: self.update_tx.clone(),
                    })))
                    .await
                    .expect("Failed to send block to transfer queue");
            }
        });
    }
}

impl FileUploadCompletionWatcher {
    pub async fn wait_upload_complete(mut self) {
        let file_started_event = self.file_started_rx.await.expect("Failed to receive file upload started event.");
        let started_at = file_started_event.started_at;
        
        let mut num_completed = 0;
        while let Some(block_update) = self.update_rx.recv().await {
            match block_update {
                BlockTransferUpdate::Progress {
                    block_id,
                    block_index,
                    size,
                } => {
                    println!("Block {block_index} progressed by {size} bytes");
                    self.events
                        .send(TransferUpdate::ChunkProgress {
                            chunk_index: block_index,
                            chunk_id: block_id.clone(),
                            size,
                            file_id: self.file_job._id.clone(),
                            transfer_id: self.transfer_id.clone(),
                        })
                        .await;
                }
                BlockTransferUpdate::Completed {
                    block_id,
                    block_index,
                } => {
                    num_completed += 1;
                    println!("Completed {num_completed} blocks for file {:?}", self.file_job.name);
                    self.events
                        .send(TransferUpdate::ChunkCompleted {
                            chunk_index: block_index,
                            chunk_id: block_id.clone(),
                            file_id: self.file_job._id.clone(),
                            transfer_id: self.transfer_id.clone(),
                        })
                        .await;
                }
                BlockTransferUpdate::Failed {
                    block_id,
                    block_index,
                    error,
                } => {
                    println!("Failed to upload block {block_index} id: {block_id}: {error}");
                }
            };
        }

        println!(
            "Completed all {num_completed} blocks from file {}",
            self.file_job.name
        );

        let blocks = &self.file_job.blocks;
        let block_ids: Vec<_> = blocks
            .iter()
            .map(|b| {
                let bytes: Vec<_> = b._id.as_bytes().iter().map(|v| v.clone()).collect();
                BlobBlockType::new_uncommitted(bytes)
            })
            .collect();

        println!("block list {:?}", block_ids.len());
        let block_list = BlockList { blocks: block_ids };

        self.blob_client
            .put_block_list(block_list)
            .into_future()
            .await
            .unwrap();

        println!(
            "Completed upload for file {} in {}s",
            self.file_job.name,
            started_at.elapsed().as_secs_f64()
        );

        self.events
            .send(TransferUpdate::FileCompleted {
                file_id: self.file_job._id.clone(),
                transfer_id: self.transfer_id.clone(),
            })
            .await;
    }
}
