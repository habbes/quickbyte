use std::sync::Arc;

use crate::core::request::Request;
use super::{event::Event, transfer_manager::TransferManager};
use crate::message_channel::MessageChannel;

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
        cloned.execute_request(request);
      }),
      events,
      transfers
    }
  }
}
