use super::{downloader::SharedLinkDownloader, dtos::{SharedLinkDownloadRequest, TransferJob, TransferJobFile, TransferKind}, event::Event, models::JobStatus, request::Request};
use std::{borrow::Borrow, sync::Mutex};
use crate::message_channel::MessageChannel;

#[derive(Debug)]
pub struct TransferManager {
  events: MessageChannel<Event>,
  next_id: Mutex<u64>,
  chunk_size: u64,
  transfers: Mutex<Vec<TransferJob>>,
}

impl TransferManager {
  pub fn new(events: MessageChannel<Event>) -> Self {
    Self {
      events,
      next_id: Mutex::new(1),
      chunk_size: 0x1000 * 0x1000, // 16MB
      transfers: Mutex::new(vec![])
    }
  }

  pub async fn execute_request(&self, request: Request) {
    println!("Executing request {request:?}");
    match request {
      Request::DownloadSharedLink(download_request) => self.start_download(download_request).await,
      Request::GetTransfers => self.broadcast_transfers()
    }
  }

  pub fn broadcast_transfers(&self) {
    println!("Get transfers request handling.");
    self.events.send(Event::Transfers((*self.transfers.lock().unwrap()).clone()))
  }

  pub async fn start_download(&self, request: SharedLinkDownloadRequest) {
    println!("Start download {request:?}");
    let id = {
      let mut next_id = self.next_id.lock().unwrap();
      let cur_id = *next_id;
      *next_id += 1;
      cur_id
    };

    let job = self.init_download_job(id.to_string(), &request);
    let cloned_job = job.clone(); // TODO: try to get reference or at least move to heap instead of sharing
    {
      let mut transfers = self.transfers.lock().unwrap();
      transfers.push(job);
    };
  
    self.events.send(Event::TransferCreated(cloned_job.clone()));

    let downloader = SharedLinkDownloader::new(&cloned_job);
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