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
        println!("Sending request {request:?}");
        self.request_tx.send(request).await.unwrap(); // TODO: error handling
    }
}
