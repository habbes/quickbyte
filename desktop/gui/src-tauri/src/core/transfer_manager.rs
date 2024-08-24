use super::{downloader::SharedLinkDownloader, dtos::{SharedLinkDownloadRequest, TransferJob, TransferJobFile, TransferKind}, event::Event, models::JobStatus, request::Request};
use crate::message_channel::MessageChannel;

#[derive(Debug)]
pub struct TransferManager<'a> {
  events: &'a MessageChannel<Event>,
  next_id: u64,
  chunk_size: u64,
  transfers: Vec<TransferJob>,
}

impl<'a> TransferManager<'a> {
  pub fn new(events: &'a MessageChannel<Event>) -> Self {
    Self {
      events,
      next_id: 1,
      chunk_size: 0x1000 * 0x1000, // 16MB
      transfers: vec![]
    }
  }

  pub async fn execute_request(&mut self, request: Request) {
    match request {
      Request::DownloadSharedLink(download_request) => self.start_download(download_request).await,
      Request::GetTransfers => self.broadcast_transfers()
    }
  }

  pub fn broadcast_transfers(&self) {
    self.events.send(Event::Transfers(self.transfers.clone()))
  }

  pub async fn start_download(&mut self, request: SharedLinkDownloadRequest) {
    let id = self.next_id;
    self.next_id = self.next_id + 1;
    let job = self.init_download_job(id.to_string(), &request);
    self.transfers.push(job);
    let job = &self.transfers[self.transfers.len() - 1];
  
    self.events.send(Event::TransferCreated(job.clone()));

    let downloader = SharedLinkDownloader::new(&job);
    downloader.start_download(id.to_string()).await;
  }

  fn init_download_job(&self, id: String, request: &SharedLinkDownloadRequest) -> TransferJob {
    let files: Vec<TransferJobFile> = request.files.iter().map(|f| TransferJobFile {
        _id: String::from("0"),
        name: f.name.clone(),
        size: f.size,
        completed_size: 0,
        local_path: request.target_path.clone() + "/" + f.name.as_str(),
        status: JobStatus::Pending,
        error: None,
        remote_url: f.download_url.clone(),
        chunk_size: self.chunk_size
    }).collect();

    let job = TransferJob{
        _id: id,
        name: request.name.clone(),
        total_size: 0,
        completed_size: 0,
        num_files: files.len(),
        local_path: request.target_path.clone(),
        files: files,
        transfer_kind: TransferKind::Download,
        status: JobStatus::Pending,
        error: None
    };
  
    job
  }
}