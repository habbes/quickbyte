use azure_storage_blobs::{blob::{BlobBlockType, BlockList}, prelude::BlobClient};
use url::Url;
use std::{os::unix::fs::FileExt, sync::Arc, time::Instant};
use crate::core::models::JobStatus;

use super::{dtos::*, transfer_queue::{BlockTransferQueue, BlockTransferRequest, BlockTransferUpdate, BlockUploadRequest}};
use super::util::*;
use super::message_channel::MessageChannel;


pub struct TransferUploader<'a> {
    request: &'a TransferJob,
    transfer_queue: Arc<BlockTransferQueue>,
}

impl<'a> TransferUploader<'a> {
    pub fn new(request: &TransferJob, transfer_queue: Arc<BlockTransferQueue>) -> TransferUploader {
        TransferUploader {
            request,
            transfer_queue
        }
    }

    pub async fn start_upload(&self, events: Arc<MessageChannel<TransferUpdate>>) {
        let file_uploaders: Vec<_> = self.request.files.iter().filter(|f| f.status == JobStatus::Pending || f.status == JobStatus::Progress).map(|f|
            FileUploader::new(self.request._id.clone(), f.clone(), self.transfer_queue.clone(), Arc::clone(&events))).collect();

        let count = file_uploaders.len();

        println!("Start uploading {count} files");
        let timer = Instant::now();

        let mut file_upload_tasks = Vec::with_capacity(count);

        for uploader in file_uploaders {
            let task = tokio::task::spawn(async move {
                println!("Start upload file {}", uploader.file_job.name);
                uploader.upload_file().await;
            });

            file_upload_tasks.push(task);
        }

        println!("Transfer uploader waiting for file jobs to complete");
        for task in file_upload_tasks {
            task.await.unwrap();
        }

        println!("Finished uploading {} files in {}s", count, timer.elapsed().as_secs_f64());
        events.send(TransferUpdate::TransferCompleted { transfer_id: self.request._id.clone() }).await;
    }
}

struct FileUploader {
    transfer_id: String,
    file_job: Arc<TransferJobFile>,
    events: Arc<MessageChannel<TransferUpdate>>,
    transfer_queue: Arc<BlockTransferQueue>
}

impl FileUploader {
    pub fn new(transfer_id: String, file_job: TransferJobFile, transfer_queue: Arc<BlockTransferQueue>, events: Arc<MessageChannel<TransferUpdate>>) -> Self {
        Self {
            transfer_id,
            file_job: Arc::new(file_job),
            events,
            transfer_queue
        }
    }

    pub async fn upload_file(&self) {
        println!("Uploading file {}", self.file_job.name);
        let url = Url::parse(&self.file_job.remote_url).expect("Failed to parse remote url");
        let blob_client = Arc::new(BlobClient::from_sas_url(&url).expect("Failed to create Block client"));
        let file = Arc::new(std::fs::File::open(&self.file_job.local_path).expect("Failed to open local file for download"));
        let file_id = self.file_job._id.clone();
        let transfer_id = self.transfer_id.clone();
        let timer = Instant::now();
        let (tx, mut rx) = tokio::sync::mpsc::channel(self.file_job.blocks.len());

        let file_job = self.file_job.clone();
        let transfer_queue = self.transfer_queue.clone();
        let mut num_to_send = 0;
        
        let block_blob_client = blob_client.clone();
        tokio::spawn(async move {
            for block in &file_job.blocks {
                if block.status == JobStatus::Completed {
                    continue;
                }

                num_to_send += 1;
                let chunk_size = file_job.chunk_size;
                let offset = block.index * chunk_size;
                let end = std::cmp::min(offset + chunk_size, file_job.size);
                let real_size = end - offset;


                println!("Sent block {} of file {} to queue", block.index, file_job.name);
                // Since the transfer queue is bounded, the task might block at this point
                // this means we won't start receiving progress updates until all the
                // blocks have been queued. And that will wait until all but the last
                // batch have been uploaded.
                // We should either make sure the queue does not block or 
                // we start receiving updates before we finish sending the tasks.
                transfer_queue.send(BlockTransferRequest::Upload(
                    Box::new(BlockUploadRequest {
                        block: block.clone(),
                        offset: offset,
                        size: real_size,
                        file: Arc::clone(&file),
                        client: block_blob_client.clone(),
                        update_channel: tx.clone()
                    })
                )).await.expect("Failed to send block to transfer queue");
            }
        });
        
        let mut num_completed = 0;
        println!("Waiting of for updates from {num_to_send} blocks (out of a total {num_completed})");
        println!("Dropping unused transmitter");
        
        println!("Dropped unused transmitter");

        
        // once all the workers have finished transmitting updates, the channel
        // will be closed.
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
                            file_id: file_id.clone(),
                            transfer_id: transfer_id.clone()
                        }
                    ).await;
                },
                BlockTransferUpdate::Completed {
                    block_id,
                    block_index,
                } => {
                    num_completed += 1;
                    println!("Completed {num_completed}/{num_to_send}");
                    self.events.send(
                        TransferUpdate::ChunkCompleted {
                            chunk_index: block_index,
                            chunk_id: block_id.clone(),
                            file_id: file_id.clone(),
                            transfer_id: transfer_id.clone()
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
            };
        }

        println!("Completed all {num_to_send} blocks from file {}", self.file_job.name);

        let blocks = &self.file_job.blocks;
        let  block_ids: Vec<_> = blocks.iter().map(|b| {
            let bytes: Vec<_> = b._id.as_bytes().iter().map(|v| v.clone()).collect();
            BlobBlockType::new_uncommitted(bytes)
        }).collect();

        println!("block list {:?}", block_ids.len());
        let block_list = BlockList {
            blocks: block_ids
        };

        blob_client
            .put_block_list(block_list)
            .into_future()
            .await.unwrap();

        println!("Completed upload for file {} in {}s", self.file_job.name, timer.elapsed().as_secs_f64());
        self.events.send(
            TransferUpdate::FileCompleted {
                file_id: self.file_job._id.clone(),
                transfer_id: self.transfer_id.clone()
            }
        ).await;
    }

    pub async fn upload_file_old(&self) {
        // Parse the URL and create a BlobClient
        let url = Url::parse(&self.file_job.remote_url).unwrap();
        let blob_client = Arc::new(BlobClient::from_sas_url(&url).unwrap());

        // Open the file for reading
        let file = Arc::new(std::fs::File::open(&self.file_job.local_path).unwrap());
        let num_chunks = get_num_chunks(self.file_job.size, self.file_job.chunk_size);

        println!("Uploading file {} in {} chunks", self.file_job.name, num_chunks);
        let timer = Instant::now();
        // Vector to hold all the upload tasks
        let mut upload_tasks = Vec::with_capacity(num_chunks as usize);

        for block in &self.file_job.blocks {
            if block.status == JobStatus::Completed {
                continue;
            }

            let blob_client = Arc::clone(&blob_client);
            let file = Arc::clone(&file);
            let chunk_size = self.file_job.chunk_size;
            let offset = block.index * chunk_size;
            let end = std::cmp::min(offset + chunk_size, self.file_job.size);
            let real_size = end - offset;

            let events = Arc::clone(&self.events);
            let file_id = self.file_job._id.clone();
            let transfer_id = self.transfer_id.clone();

            let block_id: String = block._id.clone();
            let block_index = block.index;
            // Create a task for each chunk upload
            let task = tokio::task::spawn(async move {
                let mut buffer = vec![0u8; (end - offset) as usize];
                // file.seek(tokio::io::SeekFrom::Start(offset)).await?;
                file.read_exact_at(&mut buffer, offset).unwrap();
                
                
                // Upload the block
                blob_client
                    .put_block(block_id.clone().into_bytes(), buffer)
                    .into_future()
                    .await.unwrap();

                
                events.send(
                    TransferUpdate::ChunkProgress {
                        chunk_index: block_index,
                        chunk_id: block_id.clone(),
                        size: real_size,
                        file_id: file_id.clone(),
                        transfer_id: transfer_id.clone()
                    }
                ).await;

                events.send(
                    TransferUpdate::ChunkCompleted {
                        chunk_index: block_index,
                        chunk_id: block_id.clone(),
                        file_id: file_id.clone(),
                        transfer_id: transfer_id.clone()
                    }
                ).await;

                Ok::<(), azure_core::Error>(())
            });

            upload_tasks.push(task);
        }

        // Wait for all uploads to complete
        // let results = join_all(upload_tasks).await;
        for task in upload_tasks {
            task.await.unwrap().unwrap();
        }

        println!("Completed {} chunks for file {} in {}s", num_chunks, self.file_job.name, timer.elapsed().as_secs_f64());

        // Check if any of the tasks failed
        // for result in results {
        //     result??;
        // }

        // Commit the block list
        
        let block_ids = (0..num_chunks)
        .map(|i| {
            let id = format!("{:032x}", i + 1);
            let bytes: Vec<_> = id.as_bytes().iter().map(|v| v.clone()).collect();
            BlobBlockType::new_uncommitted(bytes)
        })
        .collect::<Vec<_>>();

        println!("block list {:?}", block_ids);
        let block_list = BlockList {
            blocks: block_ids
        };

        blob_client
            .put_block_list(block_list)
            .into_future()
            .await.unwrap();

        println!("Completed upload for file {} in {}s", self.file_job.name, timer.elapsed().as_secs_f64());
        self.events.send(
            TransferUpdate::FileCompleted {
                file_id: self.file_job._id.clone(),
                transfer_id: self.transfer_id.clone()
            }
        ).await;
    }
}