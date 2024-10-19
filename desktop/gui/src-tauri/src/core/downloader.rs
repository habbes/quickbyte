use azure_storage_blobs::prelude::BlobClient;
use std::{fs::File, io::Write, sync::Arc};
use std::time::Instant;
use crate::core::error::AppError;
use crate::core::models::JobStatus;
use crate::core::transfer_queue::{BlockDownloadRequest, BlockTransferRequest, BlockTransferUpdate};

use super::message_channel::MessageChannel;

use super::dtos::*;
use super::transfer_cancellation_tracker::{FileCancellationTracker, TransferCancellationTracker};
use super::transfer_queue::BlockTransferQueue;

pub struct TransferDownloader<'a> {
    request: &'a TransferJob,
    cancellation_tracker: TransferCancellationTracker,
}

impl TransferDownloader<'_> {
    pub fn new(request: &TransferJob, cancellation_tracker: TransferCancellationTracker) -> TransferDownloader {
        TransferDownloader {
            request,
            cancellation_tracker
        }
    }

    pub async fn start_download(&self, transfer_queue: Arc<BlockTransferQueue>, events: Arc<MessageChannel<TransferUpdate>>) {
        let files = &self.request.files;
        
        let mut dispatchers: Vec<FileDownloadBlocksDispatcher> = vec![];
        let mut watchers = vec![];
        // consider sorting files by size so smaller files can be downloaded and completed first
        for f in files {
            if f.status == JobStatus::Pending || f.status == JobStatus::Progress {
                let cancellation_tracker = self.cancellation_tracker
                    .get_file_cancellation_tracker(&f._id)
                    .expect("Failed to get cancellation tracker for file");
                let (dispatcher, watcher) = init_file_downloader(
                    f.clone(),
                    self.request._id.clone(),
                    transfer_queue.clone(),
                    events.clone(),
                    cancellation_tracker
                );
                
                dispatchers.push(dispatcher);
                watchers.push(watcher);
            }
        }

        // create a single task for all dispatchers because
        // we want block download jobs to be dispatched sequentially
        // and downloaded concurrently, but in the file order
        // so that we can prioritize completing a few files before
        // starting others
        let mut tasks = vec![];
        tasks.push(tokio::spawn(async move {
            for dispatcher in dispatchers {
                if !dispatcher.cancellation_tracker.is_cancelled() {
                    dispatcher.queue_file().await;
                } else {
                    println!("File is cancelled, skip queueing");
                }
            }
        }));

        // create a task by watcher because it's possible
        // that one file could start sending progress updates
        // before another file has complted
        for watcher in watchers {
            tasks.push(tokio::spawn(async move {
                watcher.wait_transfer_complete().await;
            }))
        }

        for task in tasks {
            task.await.unwrap();
        }
    
        events.send(TransferUpdate::TransferCompleted { transfer_id: self.request._id.clone() }).await;
    }
}

fn init_file_downloader(
    file_job: TransferJobFile,
    transfer_id: String,
    transfer_queue: Arc<BlockTransferQueue>,
    events: Arc<MessageChannel<TransferUpdate>>,
    cancellation_tracker: FileCancellationTracker,
) -> (FileDownloadBlocksDispatcher, FileDownloadCompletionWatcher) {
    let file_job = Arc::new(file_job);
    let (tx, rx) = tokio::sync::mpsc::channel(file_job.blocks.len());
    let (file_started_tx, file_started_rx) = tokio::sync::oneshot::channel();
    let dispatcher = FileDownloadBlocksDispatcher {
        file_job: file_job.clone(),
        transfer_queue: transfer_queue.clone(),
        update_tx: tx,
        file_started_tx,
        cancellation_tracker
    };

    let completion_watcher = FileDownloadCompletionWatcher {
        file_job: file_job,
        transfer_id: transfer_id.clone(),
        update_rx: rx,
        events,
        file_started_rx
    };

    (dispatcher, completion_watcher)
}

struct FileDownloadBlocksDispatcher {
    file_job: Arc<TransferJobFile>,
    transfer_queue: Arc<BlockTransferQueue>,
    update_tx: tokio::sync::mpsc::Sender<BlockTransferUpdate>,
    file_started_tx: tokio::sync::oneshot::Sender<FileTransferStartMessage>,
    cancellation_tracker: FileCancellationTracker
}

struct FileDownloadCompletionWatcher {
    file_job: Arc<TransferJobFile>,
    transfer_id: String,
    update_rx: tokio::sync::mpsc::Receiver<BlockTransferUpdate>,
    events: Arc<MessageChannel<TransferUpdate>>,
    file_started_rx: tokio::sync::oneshot::Receiver<FileTransferStartMessage>,
}

#[derive(Debug)]
enum FileTransferStartMessage {
    Success {
        file: Arc<std::sync::Mutex<std::fs::File>>,
        started_at: std::time::Instant,
    },
    Failed {
        error: String
    },
    Cancelled
}


impl FileDownloadBlocksDispatcher {
    pub async fn queue_file(self) {
        // create file
        let started_at = Instant::now();

        if self.cancellation_tracker.is_cancelled() {
            self.file_started_tx.send(FileTransferStartMessage::Failed {
                error: String::from("Download cancelled")
            }).expect("Failed to send file transfer started event");
            return;
        }

        let file_path = std::path::Path::new(&self.file_job.local_path);
        let directory = match file_path.parent() {
            Some(parent) => parent,
            None => {
                self.file_started_tx.send(FileTransferStartMessage::Failed {
                    error: format!("Failed to find parent directory of file {file_path:?}")
                }).expect("Failed to send file transfer started event");

                return;
            }
        };

        if let Err(err) = std::fs::create_dir_all(directory) {
            self.file_started_tx.send(FileTransferStartMessage::Failed {
                error: AppError::from(err).to_string()
            }).expect("Failed to send file transfer started event");

            return;
        };
    
        let file = match File::create(std::path::Path::new(&self.file_job.local_path)) {
            Ok(f) => f,
            Err(err) => {
                self.file_started_tx.send(FileTransferStartMessage::Failed {
                    error: AppError::from(err).to_string()
                }).expect("Failed to send file transfer started event");
    
                return;
            }
        };
    
        if let Err(err) = file.set_len(self.file_job.size) {
            self.file_started_tx.send(FileTransferStartMessage::Failed {
                error: AppError::from(err).to_string()
            }).expect("Failed to send file transfer started event");

            return;
        }

        let url = match url::Url::parse(&self.file_job.remote_url) {
            Ok(url) => url,
            Err(err) => {
                self.file_started_tx.send(FileTransferStartMessage::Failed {
                    error: err.to_string()
                }).expect("Failed to send file transfer started event");
    
                return;
            }
        };

        let blob = match BlobClient::from_sas_url(&url) {
            Ok(b) => Arc::new(b),
            Err(err) => {
                self.file_started_tx.send(FileTransferStartMessage::Failed {
                    error: AppError::from(err).to_string()
                }).expect("Failed to send file transfer started event");
    
                return;
            }
        };
        
        let file = Arc::new(std::sync::Mutex::new(file));

        self.file_started_tx.send(FileTransferStartMessage::Success {
            file: file.clone(),
            started_at: started_at
        }).expect("Failed to send file transfer started event");

        let file_job = self.file_job.clone();
        let transfer_queue = self.transfer_queue.clone();

        for block in &file_job.blocks {
            if block.status == JobStatus::Completed {
                continue;
            }

            if self.cancellation_tracker.is_cancelled() {
                println!("File {} {} cancelled, stop queuing blocks", file_job._id, file_job.name);
                break;
            }

            let chunk_size = file_job.chunk_size;
            let offset = block.index * chunk_size;
            let end = std::cmp::min(offset + chunk_size, file_job.size);
            let real_size = end - offset;

            transfer_queue.send(BlockTransferRequest::Download(
                Box::new(BlockDownloadRequest {
                    block: block.clone(),
                    offset,
                    size: real_size,
                    file: file.clone(),
                    client: blob.clone(),
                    update_channel: self.update_tx.clone(),
                    cancellation: self.cancellation_tracker.clone(),
                })
            )).await.expect("Failed to send download block to queue");
        }
    }
}

impl FileDownloadCompletionWatcher {
    pub async fn wait_transfer_complete(mut self) {
        let mut num_completed = 0;

        let file_started_event = self.file_started_rx.await.expect("Failed to receive file started event");
        let (file, started_at) = match file_started_event {
            FileTransferStartMessage::Success { file, started_at } => (file, started_at),
            FileTransferStartMessage::Failed { error } => {
                self.events.send(
                    TransferUpdate::FileFailed {
                        file_id: self.file_job._id.clone(),
                        transfer_id: self.transfer_id.clone(),
                        error: error
                    }
                ).await;

                return;
            },
            FileTransferStartMessage::Cancelled => {
                self.events.send(
                    TransferUpdate::FileCancelled {
                        file_id: self.file_job._id.clone(),
                        transfer_id: self.transfer_id.clone()
                    }
                ).await;

                return;
            }
        };

        let mut cancelled = false;

        while let Some(block_update) = self.update_rx.recv().await {
            match block_update {
                BlockTransferUpdate::Progress {
                    block_id,
                    block_index,
                    size,
                }  => {
                    self.events.send(
                        TransferUpdate::ChunkProgress {
                            chunk_index: block_index,
                            chunk_id: block_id.clone(),
                            size,
                            file_id: self.file_job._id.clone(),
                            transfer_id: self.transfer_id.clone()
                        }
                    ).await;
                },
                BlockTransferUpdate::Completed {
                    block_id,
                    block_index,
                } => {
                    num_completed += 1;
                    println!("Completed {num_completed} blocks for file {:?}", self.file_job.name);
                    self.events.send(
                        TransferUpdate::ChunkCompleted {
                            chunk_index: block_index,
                            chunk_id: block_id.clone(),
                            file_id: self.file_job._id.clone(),
                            transfer_id: self.transfer_id.clone()
                        }
                    ).await;
                },
                BlockTransferUpdate::Failed {
                    block_id,
                    block_index,
                    error
                } => {
                    println!("Failed to download block {block_index} id: {block_id}: {error}");
                    self.events
                    .send(TransferUpdate::FileFailed {
                        file_id: self.file_job._id.clone(),
                        transfer_id: self.transfer_id.clone(),
                        error: error
                    })
                    .await;

                    return;
                },
                BlockTransferUpdate::Cancelled {
                    block_id,
                    block_index,
                } => {
                    println!("Block download cancelled {block_index} id: {block_id}");
                    cancelled = true;
                    self.events
                    .send(TransferUpdate::FileCancelled { 
                        file_id: self.file_job._id.clone(),
                        transfer_id: self.transfer_id.clone(),
                    })
                    .await;
                }
            }
        }
        
        if cancelled {
            std::fs::remove_file(self.file_job.local_path.clone())
            .expect(format!("Failed to delete cancelled file {}", self.file_job.local_path).as_str());
            println!("File cancelled, delete file.");
            return;
        }
        

        println!("Finish downloading file {} after {}s. Flushing...", self.file_job.name, started_at.elapsed().as_secs_f64());

        let flush_result = file
        .lock()
        .expect("Failed to acquire file write lock")
        .flush();

        if let Err(err) = flush_result {
            self.events.send(TransferUpdate::FileFailed {
                file_id: self.file_job._id.clone(),
                transfer_id: self.transfer_id.clone(),
                error: AppError::from(err).to_string()
            }).await;

            return;
        }

        println!("Completed flushing file {} after {}s", self.file_job.name, started_at.elapsed().as_secs_f64());

        self.events.send(TransferUpdate::FileCompleted {
            file_id: self.file_job._id.clone(),
            transfer_id: self.transfer_id.clone()
        }).await;
    }
}
