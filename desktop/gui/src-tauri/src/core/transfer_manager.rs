use std::sync::Arc;

use super::{downloader::SharedLinkDownloader, dtos::*, event::Event, models::JobStatus, request::Request};
use tokio::sync::Mutex;
use super::message_channel::MessageChannel;

#[derive(Debug)]
pub struct TransferManager {
  events: Arc<MessageChannel<Event>>,
  next_id: Mutex<u64>,
  chunk_size: u64,
  transfers: Arc<Mutex<Vec<TransferJob>>>,
}

impl TransferManager {
  pub fn new(events: MessageChannel<Event>) -> Self {
    Self {
      events: Arc::new(events),
      next_id: Mutex::new(1),
      chunk_size: 0x1000 * 0x1000, // 16MB
      transfers: Arc::new(Mutex::new(vec![]))
    }
  }

  pub async fn execute_request(&self, request: Request) {
    println!("Executing request {request:?}");
    match request {
      Request::DownloadSharedLink(download_request) => self.start_download(download_request).await,
      Request::GetTransfers => self.broadcast_transfers().await
    }
  }

  pub async fn broadcast_transfers(&self) {
    println!("Get transfers request handling.");
    self.events.send(Event::Transfers((*self.transfers.lock().await).clone())).await;
  }

  pub async fn start_download(&self, request: SharedLinkDownloadRequest) {
    println!("Start download {request:?}");
    let id = {
      let mut next_id = self.next_id.lock().await;
      let cur_id = *next_id;
      *next_id += 1;
      cur_id
    };

    let job = self.init_download_job(id.to_string(), &request);
    let cloned_job = job.clone(); // TODO: try to get reference or at least move to heap instead of sharing
    {
      let mut transfers = self.transfers.lock().await;
      transfers.push(job);
    };
  
    self.events.send(Event::TransferCreated(cloned_job.clone())).await;

    let downloader = SharedLinkDownloader::new(&cloned_job);
    let transfers = Arc::clone(&(self.transfers));
    let events = Arc::clone(&self.events);
    let job_updates: MessageChannel<TransferUpdate> = MessageChannel::new(move|update: TransferUpdate| {
      // handle_transfer_update(Arc::clone(&transfers), update);
      let transfers = Arc::clone(&transfers);
      let events = Arc::clone(&events);
      tokio::spawn(async move {
        handle_transfer_update(Arc::clone(&transfers), &update, Arc::clone(&events)).await;
      });
    });
    let job_updates = Arc::new(job_updates);
    downloader.start_download(job_updates).await;
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
        total_size: files.iter().map(|f| f.size).sum(),
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

async fn handle_transfer_update(transfers: Arc<Mutex<Vec<TransferJob>>>, update: &TransferUpdate, events: Arc<MessageChannel<Event>>) {
  let mut transfers = transfers.lock().await;
  match update {
    TransferUpdate::ChunkCompleted {
      chunk_index: _,
      chunk_id: _,
      size,
      file_id,
      transfer_id
    } => {
      // let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
      // let file = transfer.files.iter_mut().find(|f| f._id == file_id).unwrap();
      // file.completed_size += file.size;
      // file.status = JobStatus::Completed;
      // transfer.status = JobStatus::Progress;
      handle_chunk_completed(&mut transfers, transfer_id, file_id, *size);
    },
    TransferUpdate::FileCompleted {
      file_id,
      transfer_id
    } => {
      handle_file_completed(&mut transfers, transfer_id, file_id);
      // let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
      // let file = transfer.files.iter_mut().find(|f| f._id == file_id).unwrap();
      // file.completed_size += file.size;
      // file.status = JobStatus::Completed;
      // transfer.status = JobStatus::Progress;
    },
    TransferUpdate::TransferCompleted { transfer_id } => {
      handle_transfer_completed(&mut transfers, transfer_id);
      // let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
      // transfer.status = JobStatus::Completed;
    }
  }

  events.send(Event::Transfers(transfers.clone())).await;
}

fn handle_chunk_completed(transfers: &mut tokio::sync::MutexGuard<Vec<TransferJob>>, transfer_id: &str, file_id: &str, chunk_size: u64) {
  let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
  let file = transfer.files.iter_mut().find(|f| f._id == file_id).unwrap();
  file.completed_size += chunk_size;
  file.status = JobStatus::Progress;
  transfer.status = JobStatus::Progress;
}

fn handle_file_completed(transfers: &mut tokio::sync::MutexGuard<Vec<TransferJob>>, transfer_id: &str, file_id: &str) {
  let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
  let file = transfer.files.iter_mut().find(|f| f._id == file_id).unwrap();
  file.completed_size = file.size;
  file.status = JobStatus::Completed;
  transfer.status = JobStatus::Progress;
}

fn handle_transfer_completed(transfers: &mut tokio::sync::MutexGuard<Vec<TransferJob>>, transfer_id: &str) {
  // let mut transfers = self.transfers.lock().await;
  let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
  transfer.status = JobStatus::Completed;
}