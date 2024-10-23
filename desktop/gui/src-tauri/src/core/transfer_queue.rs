use std::{io::{Read, Seek, SeekFrom, Write}, sync::Arc, time::Instant};

use azure_storage_blobs::prelude::BlobClient;
use futures::stream::StreamExt;
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
    pub file: Arc<std::sync::Mutex<std::fs::File>>,
    pub client: Arc<BlobClient>,
    pub update_channel: mpsc::Sender<BlockTransferUpdate>,
    pub cancellation: FileCancellationTracker
}

#[derive(Debug)]
pub struct BlockDownloadRequest {
    pub block: TransferJobFileBlock,
    pub offset: u64,
    pub size: u64,
    pub file: Arc<std::sync::Mutex<std::fs::File>>,
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
    // Considered using Bytes instead of Arc<Vec<u8>> but I got an error when
    // calling put_block with the BytesMut, will investigate later.
    let mut buffer = vec![0u8; request.size as usize];
    // let mut buffer = BytesMut::with_capacity(request.size as usize);
    // file.seek(tokio::io::SeekFrom::Start(offset)).await?;
    // TODO: I had used the read_exact_at API which does not require seeking
    // or locking, but it doesn't compile on Windows :(
    // TODO: consider whether using async file APIs from tokio is better for perf
    let file = request.file;
    let file_read_result = {
        let mut file = file.lock().unwrap();
        if let Err(e) = file.seek(SeekFrom::Start(request.offset)) {
            Err(e)
        } else {
            file.read_exact(&mut buffer)
        }
    };

    if let Err(file_err) = file_read_result {
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
                        .await.ok(); // ignore send error because the receiver may have been closed intentionally (e.g. due to failed block)
                        
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
}

async fn download_block(request: Box<BlockDownloadRequest>) {
    // let block_index = request.block.index;
    // let block_id = block._id.clone();

    let mut retry = true; // retry on network error
    let start_range = request.offset;
    let end_range = request.offset + request.size;
    let total_timer = std::time::Instant::now();
    let mut result_buffer = None;
    
    while retry {
        if request.cancellation.is_cancelled() {
            println!("Detected file cancelled during block download. Skipping block {} {}", request.block._id, request.block.index);
            break;
        }
        // for simplicity, we retry the entire block on error even if
        // some parts of the block were already successfully downloaded
        // and streamed in the file.
        let block_timer = std::time::Instant::now();
        let mut stream = request.client
            .get()
            .range(start_range..end_range)
            .chunk_size(request.size)
            .into_stream();
        println!("Obtained stream for block {} after {}", request.block.index, block_timer.elapsed().as_secs_f64());

        // println!("Writing chunk {} of file {}", i, file_name);
        let mut chunk_progress = 0 as u64;
        let buffer_timer = std::time::Instant::now();
        let mut buffer = Vec::with_capacity(request.size as usize);
        println!("Allocated buffer for block {} size {} in {}s", request.block.index, request.size, buffer_timer.elapsed().as_secs_f64());
        
        let stream_timer = std::time::Instant::now();
        'read_stream_loop: while let Some(value) = stream.next().await {
            println!("Fetched stream item for block {} after {}", request.block.index, stream_timer.elapsed().as_secs_f64());
            match value {
                Ok(response) => {
                    let mut body = response.data;
                    // For each response, we stream the body instead of collecting it all
                    let page_timer = std::time::Instant::now();
                    
                    while let Some(value) = body.next().await {
                        let response_timer = std::time::Instant::now();
                        match value {
                            Ok(value) => {
                                let buffer_write_timer = std::time::Instant::now();
                                buffer.extend_from_slice(&value);
                                // println!("Copied block slice {} size{} to buffer in {}s", request.block.index, value.len(), buffer_write_timer.elapsed().as_secs_f64());

                                let fetched_len = value.len() as u64;
                                chunk_progress += value.len() as u64;

                                // TODO Is this blocking? should this be sent in a separate task?
                                // Investigate impact of sending through a one shot channel
                                let started = std::time::Instant::now();
                                request.update_channel.send(BlockTransferUpdate::Progress {
                                    block_id: request.block._id.clone(),
                                    block_index: request.block.index,
                                    size: fetched_len
                                }).await.ok(); // ignore error because we can close receiver intentionally
                                // println!("Send progress block {} size {} in {}", request.block.index, fetched_len, started.elapsed().as_secs_f64());
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

                        // println!("Downloaded block slice for {}, after {}", request.block.index, response_timer.elapsed().as_secs_f64());

                        if request.cancellation.is_cancelled() {
                            println!("Detected file cancelled during block chunk download. Skipping block {} {}.", request.block._id, request.block.index);
                            break;
                        }
                    }

                    println!("Downloaded page for block {} after {}", request.block.index, page_timer.elapsed().as_secs_f64());
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
            
            println!("Finished download block {} after {}", request.block.index, block_timer.elapsed().as_secs_f64());
            // Some(buffer)
        }

        result_buffer = Some(buffer);
    }

    if request.cancellation.is_cancelled() {
        request.update_channel.send(BlockTransferUpdate::Cancelled {
            block_id: request.block._id.clone(),
            block_index: request.block.index
        }).await.expect("Failed to send chunk download cancellation update.");
    } else if let Some(buffer) = result_buffer {
        // TODO: I had used the file.write_exact_at API which does not require seeking
        // or locking, but it doesn't compile on Windows :(
        // TODO: consider whether using async file APIs from tokio is better for perf
        let file_write_result = {
            let timer = std::time::Instant::now();
            let mut file = request.file.lock()
                .expect("Failed to acquire file lock");
            println!("Obtained file lock for block {} after {}", request.block.index, timer.elapsed().as_secs_f64());
            if let Err(e) = file.seek(SeekFrom::Start(request.offset)) {
                Err(e)
            } else {
                println!("Seeked file for block {} after {}", request.block.index, timer.elapsed().as_secs_f64());
                let result = file.write_all(&buffer);
                println!("Finished writing file for block slice {} size {} after {}", request.block.index, buffer.len(), timer.elapsed().as_secs_f64());
                result
            }

        };

        if let Err(err) = file_write_result {
            let msg = AppError::from(err).to_string();
            request.update_channel.send(BlockTransferUpdate::Failed {
                block_id: request.block._id.clone(),
                block_index: request.block.index,
                error: msg
            }).await.ok();
            return;
        }

        // request.update_channel.send(BlockTransferUpdate::Progress {
        //     block_id: request.block._id.clone(),
        //     block_index: request.block.index,
        //     size: request.size
        // }).await.ok(); // ignore error because we can close receiver intentionally

        request.update_channel.send(BlockTransferUpdate::Completed {
            block_id: request.block._id,
            block_index: request.block.index,
        }).await.expect("Failed to send chunk download completion update.");
    }

    println!("Finished sending block update for {} after {}", request.block.index, total_timer.elapsed().as_secs_f64());
}
