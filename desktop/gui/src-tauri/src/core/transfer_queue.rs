use std::{io::Write, sync::Arc, time::Instant};

use azure_storage_blobs::prelude::BlobClient;
use futures::stream::StreamExt;
use std::os::unix::fs::FileExt;
use tokio::sync::mpsc;
use bytes::{Buf, BufMut, Bytes, BytesMut};


use super::{
    dtos::{TransferJobFileBlock, TransferUpdate},
    error::AppError,
    message_channel::MessageChannel, transfer_cancellation_tracker::FileCancellationTracker,
};

// chunks from all transfers will be queued through
// a single channel
// the channel, this will allow us to control concurrency and
// to prioritize chunks to upload

#[derive(Debug)]
pub enum BlockTransferRequest {
    // file handle (or file name)
    // file id
    // transfer id
    // chunk id
    // chunk index
    // uploader
    Upload(Box<BlockUploadRequest>),
    Download(Box<BlockDownloadRequest>),
}

#[derive(Debug)]
pub struct BlockUploadRequest {
    pub block: TransferJobFileBlock,
    pub offset: u64,
    pub size: u64,
    pub file: Arc<std::fs::File>,
    pub client: Arc<BlobClient>,
    pub update_channel: mpsc::Sender<BlockTransferUpdate>,
    pub cancellation: FileCancellationTracker
}

#[derive(Debug)]
pub struct BlockDownloadRequest {
    pub block: TransferJobFileBlock,
    pub offset: u64,
    pub size: u64,
    pub file: Arc<std::sync::RwLock<std::fs::File>>,
    pub client: Arc<BlobClient>,
    pub update_channel: mpsc::Sender<BlockTransferUpdate>,
    pub cancellation: FileCancellationTracker
}

#[derive(Debug)]
pub enum BlockTransferUpdate {
    Progress {
        block_id: String,
        block_index: u64,
        size: u64,
    },
    Completed {
        block_id: String,
        block_index: u64,
    },
    Cancelled {
        block_id: String,
        block_index: u64,
    },
    Failed {
        block_id: String,
        block_index: u64,
        error: String,
    },
}

type ChunkTransmitter = mpsc::Sender<BlockTransferRequest>;

#[derive(Debug)]
pub struct BlockTransferQueue {
    tx: ChunkTransmitter,
}

impl BlockTransferQueue {
    pub fn init(buffer_size: usize) -> BlockTransferQueue {
        let (tx, mut rx) = mpsc::channel(buffer_size);

        // create task channels
        let concurrency = buffer_size;
        let mut producers: Vec<ChunkTransmitter> = Vec::with_capacity(concurrency);

        for i in 0..concurrency {
            let (tx, mut rx) = mpsc::channel(1);
            producers.push(tx);

            tokio::spawn(async move {
                while let Some(message) = rx.recv().await {
                    // await handler
                    transfer_block(message).await;
                }
            });
        }

        // handle forwarding messages to handlers
        tokio::spawn(async move {
            let mut next_channel = 0;
            while let Some(message) = rx.recv().await {
                // create a bunch of channels
                producers[next_channel]
                    .send(message)
                    .await
                    .expect("Error sending chunk message to handler");
                next_channel = (next_channel + 1) % producers.len();
            }
        });

        Self { tx }
    }

    pub async fn send(&self, chunk: BlockTransferRequest) -> Result<(), AppError> {
        println!("Send block transfer request to queue");
        let tx = self.tx.clone();
        tx.send(chunk).await?;
        Ok(())
    }
}

async fn transfer_block(request: BlockTransferRequest) {
    match request {
        BlockTransferRequest::Upload(upload_request) => {
            upload_block(upload_request).await;
        },
        BlockTransferRequest::Download(download_request) => {
            download_block(download_request).await;
        }
    }
}

async fn upload_block(request: Box<BlockUploadRequest>) {
    println!(
        "Uploading block {} size {}",
        request.block.index, request.size
    );

    // Considered using Bytes instead of Arc<Vec<u8>> but I got an error when
    // calling put_block with the BytesMut, will investigate later.
    let mut buffer = vec![0u8; request.size as usize];
    // let mut buffer = BytesMut::with_capacity(request.size as usize);
    // file.seek(tokio::io::SeekFrom::Start(offset)).await?;
    let file = request.file;
    if let Err(file_err) = file.read_exact_at(&mut buffer, request.offset) {
        let msg = AppError::from(file_err).to_string();
        println!("Failed to read file block at {:?}", request.offset);
        request.update_channel
        .send(BlockTransferUpdate::Failed {
            block_id: request.block._id.clone(),
            block_index: request.block.index,
            error: msg
        }).await.ok();

        return;
    }

    // Upload the block
    let mut retry = true;
    while retry {
        if request.cancellation.is_cancelled() {
            println!("Detected file cancelled during block download. Skipping block {} {}", request.block._id, request.block.index);
            break;
        }
        match request
            .client
            .put_block(request.block._id.clone().into_bytes(), buffer.clone())
            .into_future()
            .await {
            Ok(_) => { retry = false; },
            Err(err) => {
                match err.kind() {
                    azure_storage::ErrorKind::Io => {
                        println!("Got I/O error while uploading block {}, err: {err:?}, retrying...", request.block.index);
                        retry = true;
                    }
                    _ => {
                        let msg = AppError::from(err).to_string();
                        println!("Failed to upload block {} with error {msg}", request.block.index);
                        request.update_channel
                        .send(BlockTransferUpdate::Failed {
                            block_id: request.block._id.clone(),
                            block_index: request.block.index,
                            error: msg
                        })
                        .await.ok(); // igonore send error because the receiver may have been closed intentionally (e.g. due to failed block)
                        
                        return;
                    }
                }
            }
        }
    }

    if request.cancellation.is_cancelled() {
        request
        .update_channel
        .send(BlockTransferUpdate::Cancelled {
            block_id: request.block._id.clone(),
            block_index: request.block.index,
        })
        .await
        .ok();
        
        return;
    }

    request
        .update_channel
        .send(BlockTransferUpdate::Progress {
            block_id: request.block._id.clone(),
            block_index: request.block.index,
            size: request.size,
        })
        .await
        .ok();

    request
        .update_channel
        .send(BlockTransferUpdate::Completed {
            block_id: request.block._id.clone(),
            block_index: request.block.index,
        })
        .await
        .ok();

    println!(
        "Completed uploading block {} size {}",
        request.block.index, request.size
    );
}

async fn download_block(request: Box<BlockDownloadRequest>) {
    println!(
        "Downloading block {} size {}",
        request.block.index, request.size
    );

    // let block_index = request.block.index;
    // let block_id = block._id.clone();

    let mut retry = true; // retry on network error
    let start_range = request.offset;
    let end_range = request.offset + request.size;
    
    while retry {
        if request.cancellation.is_cancelled() {
            println!("Detected file cancelled during block download. Skipping block {} {}", request.block._id, request.block.index);
            break;
        }
        // for simplicity, we retry the entire block on error even if
        // some parts of the block were already successfully downloaded
        // and streamed in the file.
        let mut stream = request.client
            .get()
            .range(start_range..end_range)
            .chunk_size(request.size)
            .into_stream();

        // println!("Writing chunk {} of file {}", i, file_name);
        let mut chunk_progress = 0 as u64;
        'read_stream_loop: while let Some(value) = stream.next().await {
            match value {
                Ok(response) => {
                    let mut body = response.data;
                    // For each response, we stream the body instead of collecting it all
                    while let Some(value) = body.next().await {
                        match value {
                            Ok(value) => {
                                let file_write_result = request.file.read()
                                .expect("Failed to acquire file lock")
                                .write_all_at(&value, start_range + chunk_progress);

                                if let Err(err) = file_write_result {
                                    let msg = AppError::from(err).to_string();
                                    request.update_channel.send(BlockTransferUpdate::Failed {
                                        block_id: request.block._id.clone(),
                                        block_index: request.block.index,
                                        error: msg
                                    }).await.ok();
                                    return;
                                }
                                
                                let fetched_len = value.len() as u64;
                                chunk_progress += value.len() as u64;

                                // TODO Is this blocking? should this be sent in a separate task?
                                // Investigate impact of sending through a one shot channel
                                request.update_channel.send(BlockTransferUpdate::Progress {
                                    block_id: request.block._id.clone(),
                                    block_index: request.block.index,
                                    size: fetched_len
                                }).await.ok(); // ignore error because we can close receiver intentionally
                            }
                            Err(err) => {
                                if *err.kind() == azure_storage::ErrorKind::Io {
                                    println!("I/O error when downloading block {err:?}, retrying...");
                                    retry = true;
                                    break 'read_stream_loop;
                                } else {
                                    let msg = AppError::from(err).to_string();
                                    println!("Error when downloading file {msg} failed");
                                    request.update_channel.send(BlockTransferUpdate::Failed {
                                        block_id: request.block._id.clone(),
                                        block_index: request.block.index,
                                        error: msg
                                    }).await.ok();
                                    return;
                                }
                            }
                        }

                        if request.cancellation.is_cancelled() {
                            println!("Detected file cancelled during block chunk download. Skipping block {} {}.", request.block._id, request.block.index);
                            break;
                        }
                    }
                }
                Err(err) => {
                    if *err.kind() == azure_storage::ErrorKind::Io {
                        println!("I/O error when downloading block {err:?}, retrying...");
                        retry = true;
                        break 'read_stream_loop;
                    } else {
                        let msg = AppError::from(err).to_string();
                        println!("Error when downloading file {msg} failed");
                        request.update_channel.send(BlockTransferUpdate::Failed {
                            block_id: request.block._id.clone(),
                            block_index: request.block.index,
                            error: msg
                        }).await.ok();
                        return;
                    }
                }
            }

            retry = false;
        }
    }

    if request.cancellation.is_cancelled() {
        request.update_channel.send(BlockTransferUpdate::Cancelled {
            block_id: request.block._id.clone(),
            block_index: request.block.index
        }).await.expect("Failed to send chunk download cancellation update.");
    } else {
        request.update_channel.send(BlockTransferUpdate::Completed {
            block_id: request.block._id,
            block_index: request.block.index,
        }).await.expect("Failed to send chunk download completion update.");
    }
}
