use tokio::sync::mpsc::{Sender, channel};

#[derive(Debug, Clone)]
pub struct MessageChannel<T>
    where T : std::fmt::Debug + Send + 'static
{
    request_tx: Sender<T>
}

impl<T: std::fmt::Debug + Send + 'static> MessageChannel<T> {
    pub fn new<F: Fn(T) + Send + 'static>(handler: F) -> Self {
        let (tx, mut rx) = channel(32);
    
        tokio::spawn(async move {
            while let Some(message) = rx.recv().await {
                handler(message);
            }
        });

        Self {
            request_tx: tx
        }
    }

    pub async fn send(&self, request: T) {
        self.request_tx.send(request).await.unwrap(); // TODO: error handling
    }
}


#[derive(Debug, Clone)]
pub struct SyncMessageChannel<T>
    where T : std::fmt::Debug + Send + 'static
{
    request_tx: std::sync::mpsc::Sender<T>
}

impl<T: std::fmt::Debug + Send + 'static> SyncMessageChannel<T> {
    pub fn new<F: Fn(T) + Send + 'static>(handler: F) -> Self {
        let (tx, rx) = std::sync::mpsc::channel();
    
        std::thread::spawn(move || {
            while let Ok(message) = rx.recv() {
                handler(message);
            }

            println!("Sync message channel receiver thread closed");
        });

        Self {
            request_tx: tx
        }
    }

    pub fn send(&self, request: T) {
        self.request_tx.send(request).unwrap(); // TODO: error handling
    }
}