use super::{downloader::{SharedLinkDownloadRequest, SharedLinkDownloader}, event::Event};
use crate::message_channel::MessageChannel;

#[derive(Debug)]
pub struct TransferManager<'a> {
  events: &'a MessageChannel<Event>,
  next_id: u64,
}

impl<'a> TransferManager<'a> {
  pub fn new(events: &'a MessageChannel<Event>) -> Self {
    Self { events, next_id: 1 }
  }

  pub async fn start_download(&mut self, request: SharedLinkDownloadRequest) {
    let id = self.next_id;
    self.next_id = self.next_id + 1;
    let downloader = SharedLinkDownloader::new(&request);
    downloader.start_download(id.to_string()).await;
  }
}