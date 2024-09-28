use azure_storage_blobs::prelude::BlobClient;
use std::{fs::File, io::Write, sync::Arc};
use std::time::Instant;
use crate::core::models::JobStatus;
use crate::core::transfer_queue::{BlockDownloadRequest, BlockTransferRequest, BlockTransferUpdate};

use super::message_channel::MessageChannel;

use super::dtos::*;
use super::transfer_queue::BlockTransferQueue;

pub struct SharedLinkDownloader<'a> {
    request: &'a TransferJob
}

impl SharedLinkDownloader<'_> {
    pub fn new(request: &TransferJob) -> SharedLinkDownloader {
        SharedLinkDownloader {
            request,
        }
    }

    pub async fn start_download(&self, transfer_queue: Arc<BlockTransferQueue>, events: Arc<MessageChannel<TransferUpdate>>) {
        let files = &self.request.files;
        println!("Init download of {}", files.len());
        
        let mut dispatchers: Vec<FileDownloadBlocksDispatcher> = vec![];
        let mut watchers = vec![];
        // consider sorting files by size so smaller files can be downloaded and completed first
        for f in files {
            if f.status == JobStatus::Pending || f.status == JobStatus::Progress {
                let (dispatcher, watcher) = init_file_downloader(
                    f.clone(),
                    self.request._id.clone(),
                    transfer_queue.clone(),
                    events.clone());
                
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
                dispatcher.queue_file().await;
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
) -> (FileDownloadBlocksDispatcher, FileDownloadCompletionWatcher) {
    let file_job = Arc::new(file_job);
    let (tx, rx) = tokio::sync::mpsc::channel(file_job.blocks.len());
    let (file_started_tx, file_started_rx) = tokio::sync::oneshot::channel();
    let dispatcher = FileDownloadBlocksDispatcher {
        file_job: file_job.clone(),
        transfer_queue: transfer_queue.clone(),
        update_tx: tx,
        file_started_tx
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
    file_started_tx: tokio::sync::oneshot::Sender<FileTransferStartedMessage>
}

struct FileDownloadCompletionWatcher {
    file_job: Arc<TransferJobFile>,
    transfer_id: String,
    update_rx: tokio::sync::mpsc::Receiver<BlockTransferUpdate>,
    events: Arc<MessageChannel<TransferUpdate>>,
    file_started_rx: tokio::sync::oneshot::Receiver<FileTransferStartedMessage>,
}

#[derive(Debug)]
struct FileTransferStartedMessage {
    file: Arc<std::sync::RwLock<std::fs::File>>,
    started_at: std::time::Instant,
}


impl FileDownloadBlocksDispatcher {
    pub async fn queue_file(self) {
        // create file
        let started_at = Instant::now();
        println!("Start download for file {}", self.file_job.name);
        let file_path = std::path::Path::new(&self.file_job.local_path);
        let directory = file_path.parent().unwrap();
        std::fs::create_dir_all(directory).unwrap();
        let file = File::create(std::path::Path::new(&self.file_job.local_path)).expect("Failed to create file for download");
    
        file.set_len(self.file_job.size).expect("Failed to initialze file length on disk.");
        // set file len on disk
        let file = Arc::new(std::sync::RwLock::new(file));

        self.file_started_tx.send(FileTransferStartedMessage {
            file: file.clone(),
            started_at: started_at
        }).expect("Failed to send file transfer started event");

        let url = url::Url::parse(&self.file_job.remote_url).expect("Failed to parse url");
        let blob = Arc::new(BlobClient::from_sas_url(&url).expect("Failed to initialized blob client from download url"));

        let file_job = self.file_job.clone();
        let transfer_queue = self.transfer_queue.clone();

        for block in &file_job.blocks {
            if block.status == JobStatus::Completed {
                continue;
            }

            let chunk_size = file_job.chunk_size;
            let offset = block.index * chunk_size;
            let end = std::cmp::min(offset + chunk_size, file_job.size);
            let real_size = end - offset;

            println!("Sent download block {} of file {} to queue", block.index, file_job.name);

            transfer_queue.send(BlockTransferRequest::Download(
                Box::new(BlockDownloadRequest {
                    block: block.clone(),
                    offset,
                    size: real_size,
                    file: file.clone(),
                    client: blob.clone(),
                    update_channel: self.update_tx.clone()
                })
            )).await.expect("Failed to send download block to queue");
        }
    }
}

impl FileDownloadCompletionWatcher {
    pub async fn wait_transfer_complete(mut self) {
        let mut num_completed = 0;

        let file_started_event = self.file_started_rx.await.expect("Failed to receive file started event");
        let file = file_started_event.file;
        let started_at = file_started_event.started_at;

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
                    println!("Failed to upload block {block_index} id: {block_id}: {error}");
                }
            }
        }
        

        println!("Finish downloading file {} after {}s. Flushing...", self.file_job.name, started_at.elapsed().as_secs_f64());
        file
        .write()
        .expect("Failed to acquire file write lock")
        .flush()
        .expect("Failed to flush file");

        println!("Completed flushing file {} after {}s", self.file_job.name, started_at.elapsed().as_secs_f64());

        self.events.send(TransferUpdate::FileCompleted {
            file_id: self.file_job._id.clone(),
            transfer_id: self.transfer_id.clone()
        }).await;
    }
}
