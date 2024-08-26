use std::sync::mpsc::{Sender, channel};
use std::thread;

#[derive(Debug, Clone)]
pub struct MessageChannel<T>
    where T : std::fmt::Debug + Send + 'static
{
    request_tx: Sender<T>
}

impl<T: std::fmt::Debug + Send + 'static> MessageChannel<T> {
    pub fn new<F: Fn(T) + Send + 'static>(handler: F) -> Self {
        let (tx, rx) = channel();
    
        thread::spawn(move || {
            for message in rx {
                handler(message);
            }
        });

        Self {
            request_tx: tx
        }
    }

    pub fn send(&self, request: T) {
        println!("Sending request {request:?}");
        self.request_tx.send(request).unwrap(); // TODO: error handling
    }
}
