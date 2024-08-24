use crate::core::request::Request;
use super::event::Event;
use crate::message_channel::MessageChannel;

#[derive(Debug)]
pub struct AppContext {
  pub requests: MessageChannel<Request>,
  pub events: MessageChannel<Event>,
}

impl AppContext<> {
  pub fn new(event_handler: impl Fn(Event) + Send + 'static) -> Self {
    Self {
      requests: MessageChannel::new(|request| {}),
      events: MessageChannel::new(event_handler)
    }
  }
}
