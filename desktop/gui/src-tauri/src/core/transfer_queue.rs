use std::sync::Arc;

use tokio::sync::{mpsc};

use super::error::AppError;

// chunks from all transfers will be queued through
// a single channel
// the channel, this will allow us to control concurrency and
// to prioritize chunks to upload

#[derive(Debug)]
pub struct ChunkTransferRequest {
    // file handle (or file name)
    // file id
    // transfer id
    // chunk id
    // chunk index
    // uploader
}

type ChunkTransmitter = mpsc::Sender<ChunkTransferRequest>;
pub type SharedChunkedTransferQueue = Arc<ChunkedTransferQueue>;

#[derive(Debug)]
pub struct ChunkedTransferQueue {
    tx: ChunkTransmitter,
}

impl ChunkedTransferQueue {
    pub fn init(buffer_size: usize) -> SharedChunkedTransferQueue {
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
                    println!("Received chunk transfer request {:?}", message);
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

        Arc::new(Self { tx })
    }

    pub async fn send(&self, chunk: ChunkTransferRequest) -> Result<(), AppError> {
        let tx = self.tx.clone();
        tx.send(chunk).await?;
        Ok(())
    }
}