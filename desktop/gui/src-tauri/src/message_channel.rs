use std::sync::mpsc::{Sender, Receiver, channel};
use std::thread;

#[derive(Debug)]
pub struct MessageChannel<T>
    where T : Send + 'static
{
    request_tx: Sender<T>
}

impl<T: Send + 'static> MessageChannel<T> {
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
        self.request_tx.send(request).unwrap(); // TODO: error handling
    }
}