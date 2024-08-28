use std::sync::Arc;
use tokio;

use crate::core::request::Request;
use crate::core::{event::Event, transfer_manager::TransferManager};
use crate::core::message_channel::MessageChannel;

#[derive(Debug)]
pub struct AppContext {
  pub requests: MessageChannel<Request>,
  pub events: MessageChannel<Event>,
  transfers: Arc<TransferManager>,
}

impl AppContext {
  pub fn new(event_handler: impl Fn(Event) + Send + 'static) -> Self {
    let events = MessageChannel::new(event_handler);
    let transfers = Arc::new(TransferManager::new(events.clone()));
    let cloned = Arc::clone(&transfers);
    Self {
      requests: MessageChannel::new(move|request| {
        println!("Request received {request:?}");
        let cloned = Arc::clone(&cloned);
        tokio::spawn(async move {
          println!("Request thread spawned.");
          println!("Request in spawned thread {request:?}");
          cloned.execute_request(request).await;
        });
        
        
      }),
      events,
      transfers
    }
  }
}
