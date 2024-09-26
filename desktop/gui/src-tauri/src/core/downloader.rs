use azure_storage_blobs::prelude::BlobClient;
use std::{fs::File, io::Write, sync::Arc};
use tokio::task;
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
        // create file download handler for each file
        let file_downloaders: Vec<_> = files.iter().filter(|f| f.status == JobStatus::Pending || f.status == JobStatus::Progress).map(|f|
            FileDownloader::new(f.clone(), self.request._id.clone(), transfer_queue.clone(), Arc::clone(&events))).collect();
        // initialize the handlers to persist records
        // run the downloaders concurrently, limiting concurrency
        let mut tasks = Vec::with_capacity(file_downloaders.len());
        for downloader in file_downloaders {
            let task = task::spawn(async move {
                // Call `az_download_file` and handle errors within the task
                downloader.start_download().await;
            });
            tasks.push(task);
        }
        // register progress update handler

        for task in tasks {
            task.await.unwrap();
        }

        println!("Finihed download job");
        events.send(TransferUpdate::TransferCompleted { transfer_id: self.request._id.clone() }).await;
    }
}

struct FileDownloader {
    file_job: TransferJobFile,
    transfer_id: String,
    events: Arc<MessageChannel<TransferUpdate>>,
    transfer_queue: Arc<BlockTransferQueue>,
}

impl FileDownloader {
    pub fn new(file: TransferJobFile, transfer_id: String, transfer_queue: Arc<BlockTransferQueue>, events: Arc<MessageChannel<TransferUpdate>>) -> FileDownloader {
        FileDownloader {
            file_job: file,
            transfer_id,
            events,
            transfer_queue
        }
    }

    pub async fn start_download(&self) {
        
        // create file
        println!("Start download for file {}", self.file_job.name);
        let started_file = Instant::now();
        let file_path = std::path::Path::new(&self.file_job.local_path);
        let directory = file_path.parent().unwrap();
        std::fs::create_dir_all(directory).unwrap();
        let file = File::create(std::path::Path::new(&self.file_job.local_path)).expect("Failed to create file for download");
        let mut file = Arc::new(file);
        // set file len on disk
        file.set_len(self.file_job.size).expect("Failed to initialze file length on disk.");

        let url = url::Url::parse(&self.file_job.remote_url).unwrap();
        let blob = Arc::new(BlobClient::from_sas_url(&url).expect("Failed to initialized blob client from download url"));

        let file_job = self.file_job.clone();
        let transfer_queue = self.transfer_queue.clone();

        let (tx, mut rx) = tokio::sync::mpsc::channel(self.file_job.blocks.len());

        let block_file = file.clone();
        tokio::spawn(async move {
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
                        file: block_file.clone(),
                        client: blob.clone(),
                        update_channel: tx.clone()
                    })
                )).await.expect("Failed to send download block to queue");
            }
        });

        let mut num_completed = 0;

        while let Some(block_update) = rx.recv().await {
            match block_update {
                BlockTransferUpdate::Progress {
                    block_id,
                    block_index,
                    size,
                }  => {
                    println!("Block {block_index} progressed by {size} bytes");
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
                    println!("Completed {num_completed}");
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
        

        println!("Finish downloading file {} after {}s. Flushing...", self.file_job.name, started_file.elapsed().as_secs_f64());
        file.flush().unwrap();
        println!("Completed flushing file {} after {}s", self.file_job.name, started_file.elapsed().as_secs_f64());

        self.events.send(TransferUpdate::FileCompleted {
            file_id: self.file_job._id.clone(),
            transfer_id: self.transfer_id.clone()
        }).await;
    }
}
