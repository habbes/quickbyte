use std::sync::mpsc::{Sender, Receiver, channel};

#[derive(Debug)]
pub struct RequestManager<T> {
    request_tx: Sender<T>
}

impl<T> RequestManager<T> {
    pub fn new() -> Self {
        let (tx, rx) = channel();

        Self {
            request_tx: tx
        }
    }
    pub fn send(&self, request: T) {
        self.request_tx.send(request).unwrap(); // TODO: error handling
    }
}