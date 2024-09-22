use std::sync::Arc;

use azure_storage_blobs::prelude::BlobClient;
use tokio::sync::mpsc;
use std::{os::unix::fs::FileExt};

use super::{dtos::{TransferJobFileBlock, TransferUpdate}, error::AppError, message_channel::MessageChannel};

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
}

#[derive(Debug)]
pub struct BlockUploadRequest {
    pub block: TransferJobFileBlock,
    pub offset: u64,
    pub size: u64,
    pub file: Arc<std::fs::File>,
    pub client: Arc<BlobClient>,
    pub update_channel: mpsc::Sender<BlockTransferUpdate>,
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
    Failed {
        block_id: String,
        block_index: u64,
        error: String
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
                producers[next_channel].send(message).await.expect("Error sending chunk message to handler");
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
        }
    }
}

async fn upload_block(request: Box<BlockUploadRequest>) {
    let mut buffer = vec![0u8; request.size as usize];
    // file.seek(tokio::io::SeekFrom::Start(offset)).await?;
    let file = request.file;
    file.read_exact_at(&mut buffer, request.offset).unwrap();
    
    
    // Upload the block
    request.client
        .put_block(request.block._id.clone().into_bytes(), buffer)
        .into_future()
        .await.expect("Failed to put block to Azure blob");

    
    request.update_channel.send(BlockTransferUpdate::Progress {
        block_id: request.block._id.clone(),
        block_index: request.block.index,
        size: request.size
    }).await;

    request.update_channel.send(BlockTransferUpdate::Completed {
        block_id: request.block._id.clone(),
        block_index: request.block.index,
    }).await;
}
