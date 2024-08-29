use std::sync::Arc;

use super::{downloader::SharedLinkDownloader, dtos::*, event::Event, message_channel::SyncMessageChannel, models::JobStatus, request::Request, uploader::*, util::get_num_chunks};
use tokio::sync::Mutex;
use super::message_channel::MessageChannel;

#[derive(Debug)]
pub struct TransferManager {
  events: Arc<MessageChannel<Event>>,
  next_id: Mutex<u64>,
  chunk_size: u64,
  transfers: Arc<Mutex<Vec<TransferJob>>>,
  db_sync_channel: Arc<SyncMessageChannel<Event>>,
}

impl TransferManager {
  pub fn new(events: MessageChannel<Event>, db_sync_channel: Arc<SyncMessageChannel<Event>>) -> Self {
    Self {
      events: Arc::new(events),
      next_id: Mutex::new(1),
      chunk_size: 0x1000 * 0x1000, // 16MB
      transfers: Arc::new(Mutex::new(vec![])),
      db_sync_channel
    }
  }

  pub async fn execute_request(&self, request: Request) {
    println!("Executing request {request:?}");
    match request {
      Request::DownloadSharedLink(download_request) => self.start_download(download_request).await,
      Request::UploadFiles(upload_reqiest) => self.start_upload(upload_reqiest).await,
      Request::ResumeTransfer (transfer) => self.resume_tranfer(transfer).await,
      Request::GetTransfers => self.broadcast_transfers().await
    }
  }

  pub async fn broadcast_transfers(&self) {
    println!("Get transfers request handling.");
    self.events.send(Event::Transfers((*self.transfers.lock().await).clone())).await;
  }

  pub async fn resume_tranfer(&self, transfer: TransferJob) {
    {
      self.transfers.lock().await.push(transfer.clone()); // TODO: avoid unnecessary cloning
    }

    if transfer.status != JobStatus::Pending && transfer.status != JobStatus::Progress {
      return;
    }

    println!("Resuming transfer {}", transfer.name);

    self.events.send(Event::TransferCreated(transfer.clone())).await;
    match transfer.transfer_kind {
      TransferKind::Download => self.run_download(&transfer).await,
      TransferKind::Upload => self.run_upload(&transfer).await,
    }
  }

  pub async fn start_download(&self, request: SharedLinkDownloadRequest) {
    println!("Start download {request:?}");
    let job = self.init_download_job(&request);
    let cloned_job = job.clone(); // TODO: try to get reference or at least move to heap instead of sharing
    {
      let mut transfers = self.transfers.lock().await;
      transfers.push(job);
    };
  
    self.events.send(Event::TransferCreated(cloned_job.clone())).await;
    self.db_sync_channel.send(Event::TransferCreated(cloned_job.clone()));

    let downloader = SharedLinkDownloader::new(&cloned_job);
    let transfers = Arc::clone(&(self.transfers));
    let events = Arc::clone(&self.events);
    let db_sync_channel = Arc::clone(&self.db_sync_channel);
    let job_updates: MessageChannel<TransferUpdate> = MessageChannel::new(move|update: TransferUpdate| {
      // handle_transfer_update(Arc::clone(&transfers), update);
      let transfers = Arc::clone(&transfers);
      let events = Arc::clone(&events);
      let db_sync_channel = Arc::clone(&db_sync_channel);
      tokio::spawn(async move {
        handle_transfer_update(Arc::clone(&transfers), &update, Arc::clone(&events), Arc::clone(&db_sync_channel)).await;
      });
    });
    let job_updates = Arc::new(job_updates);
    downloader.start_download(job_updates).await;
  }

  pub async fn run_download(&self, job: &TransferJob) {
    let downloader = SharedLinkDownloader::new(&job);
    let transfers = Arc::clone(&(self.transfers));
    let events = Arc::clone(&self.events);
    let db_sync_channel = Arc::clone(&self.db_sync_channel);
    let job_updates: MessageChannel<TransferUpdate> = MessageChannel::new(move|update: TransferUpdate| {
      // handle_transfer_update(Arc::clone(&transfers), update);
      let transfers = Arc::clone(&transfers);
      let events = Arc::clone(&events);
      let db_sync_channel = Arc::clone(&db_sync_channel);
      tokio::spawn(async move {
        handle_transfer_update(Arc::clone(&transfers), &update, Arc::clone(&events), Arc::clone(&db_sync_channel)).await;
      });
    });
    let job_updates = Arc::new(job_updates);
    downloader.start_download(job_updates).await;
  }

  pub async fn start_upload(&self, request: UploadFilesRequest) {
    println!("Start upload {request:?}");

    let job = self.init_upload_job(&request);
    let cloned_job = job.clone();
    {
      let mut transfers = self.transfers.lock().await;
      transfers.push(job);
    }

    self.events.send(Event::TransferCreated(cloned_job.clone())).await;
    self.db_sync_channel.send(Event::TransferCreated(cloned_job.clone()));

    let uploader = TransferUploader::new(&cloned_job);
    let transfers = Arc::clone(&(self.transfers));
    let events = Arc::clone(&self.events);
    let db_sync_channel = Arc::clone(&self.db_sync_channel);
    let job_updates: MessageChannel<TransferUpdate> = MessageChannel::new(move|update: TransferUpdate| {
      // handle_transfer_update(Arc::clone(&transfers), update);
      let transfers = Arc::clone(&transfers);
      let events = Arc::clone(&events);
      let db_sync_channel = Arc::clone(&db_sync_channel);
      tokio::spawn(async move {
        handle_transfer_update(Arc::clone(&transfers), &update, Arc::clone(&events), Arc::clone(&db_sync_channel)).await;
      });
    });
    let job_updates = Arc::new(job_updates);
    uploader.start_upload(job_updates).await;
  }

  async fn run_upload(&self, job: &TransferJob) {
    let uploader = TransferUploader::new(job);
    let transfers = Arc::clone(&(self.transfers));
    let events = Arc::clone(&self.events);
    let db_sync_channel = Arc::clone(&self.db_sync_channel);
    let job_updates: MessageChannel<TransferUpdate> = MessageChannel::new(move|update: TransferUpdate| {
      // handle_transfer_update(Arc::clone(&transfers), update);
      let transfers = Arc::clone(&transfers);
      let events = Arc::clone(&events);
      let db_sync_channel = Arc::clone(&db_sync_channel);
      tokio::spawn(async move {
        handle_transfer_update(Arc::clone(&transfers), &update, Arc::clone(&events), Arc::clone(&db_sync_channel)).await;
      });
    });
    let job_updates = Arc::new(job_updates);
    uploader.start_upload(job_updates).await;
  }

  fn init_download_job(&self, request: &SharedLinkDownloadRequest) -> TransferJob {
    let files: Vec<TransferJobFile> = request.files.iter().map(|f| TransferJobFile {
        _id: uuid::Uuid::new_v4().to_string(),
        remote_file_id: f._id.clone(),
        name: f.name.clone(),
        size: f.size,
        completed_size: 0,
        local_path: request.target_path.clone() + "/" + f.name.as_str(),
        status: JobStatus::Pending,
        error: None,
        remote_url: f.download_url.clone(),
        chunk_size: self.chunk_size,
        blocks: init_file_blocks(f.size, self.chunk_size)
    }).collect();

    let job = TransferJob{
        _id: uuid::Uuid::new_v4().to_string(),
        name: request.name.clone(),
        total_size: files.iter().map(|f| f.size).sum(),
        completed_size: 0,
        num_files: files.len(),
        local_path: request.target_path.clone(),
        files: files,
        transfer_kind: TransferKind::Download,
        download_type: Some(DownloadType::ProjectShare),
        share_code: Some(request.share_code.clone()),
        share_id: Some(request.share_id.clone()),
        share_password: None,
        download_transfer_id: None,
        status: JobStatus::Pending,
        error: None
    };
  
    job
  }

  fn init_upload_job(&self, request: &UploadFilesRequest) -> TransferJob {
    let files: Vec<TransferJobFile> = request.files.iter().map(|f| TransferJobFile {
      _id: uuid::Uuid::new_v4().to_string(),
      remote_file_id: f.transfer_file._id.clone(),
      name: f.transfer_file.name.clone(),
      size: f.transfer_file.size,
      completed_size: 0,
      local_path: f.local_path.clone(),
      status: JobStatus::Pending,
      error: None,
      remote_url: f.transfer_file.upload_url.clone(),
      chunk_size: self.chunk_size,
      blocks: init_file_blocks(f.transfer_file.size, self.chunk_size)
    }).collect();

    let job = TransferJob {
      _id: uuid::Uuid::new_v4().to_string(),
      name: request.name.clone(),
      total_size: files.iter().map(|f| f.size).sum(),
      completed_size: 0,
      num_files: files.len(),
      local_path: request.local_path.clone(),
      files: files,
      transfer_kind: TransferKind::Upload,
      download_type: None,
      share_code: None,
      share_id: None,
      share_password: None,
      download_transfer_id: None,
      status: JobStatus::Pending,
      error: None
    };

    job
  }
}

fn init_file_blocks(file_size: u64, block_size: u64) -> Vec<TransferJobFileBlock> {
  let count = get_num_chunks(file_size, block_size);
  let mut blocks = Vec::with_capacity(count as usize);
  for i in 0..count {
    blocks.push(TransferJobFileBlock {
      _id: uuid::Uuid::new_v4().to_string(),
      index: i,
      status: JobStatus::Pending
    })
  }

  blocks
}

async fn handle_transfer_update(transfers: Arc<Mutex<Vec<TransferJob>>>, update: &TransferUpdate, events: Arc<MessageChannel<Event>>, db_sync_channel: Arc<SyncMessageChannel<Event>>) {
  let mut transfers = transfers.lock().await;
  match update {
    TransferUpdate::ChunkProgress {
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
      handle_chunk_progress(&mut transfers, transfer_id, file_id, *size);
    },
    TransferUpdate::ChunkCompleted {
      chunk_index,
      chunk_id,
      file_id,
      transfer_id
    } => {
      handle_chunk_completed(&mut transfers, transfer_id, file_id, chunk_id.as_str());
      db_sync_channel.send(Event::TransferFileBlockStatusUpdate {
        block_id: chunk_id.clone(),
        file_id: file_id.clone(),
        status: JobStatus::Completed,
        error: None
      });
      println!("Send complete block status {chunk_id} {file_id}");
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
      db_sync_channel.send(Event::TransferFileStatusUpdate {
        file_id: file_id.clone(),
        transfer_id: transfer_id.clone(),
        status: JobStatus::Completed,
        error: None
      });
    },
    TransferUpdate::TransferCompleted { transfer_id } => {
      handle_transfer_completed(&mut transfers, transfer_id);
      // let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
      // transfer.status = JobStatus::Completed;
      db_sync_channel.send(Event::TransferStatusUpdate {
        transfer_id: transfer_id.clone(),
        status: JobStatus::Completed,
        error: None
      });
    }
  }

  events.send(Event::Transfers(transfers.clone())).await;
}

fn handle_chunk_progress(transfers: &mut tokio::sync::MutexGuard<Vec<TransferJob>>, transfer_id: &str, file_id: &str, chunk_size: u64) {
  let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
  let file = transfer.files.iter_mut().find(|f| f._id == file_id).unwrap();
  file.completed_size += chunk_size;
  file.status = JobStatus::Progress;
  transfer.status = JobStatus::Progress;
}

fn handle_chunk_completed(transfers: &mut tokio::sync::MutexGuard<Vec<TransferJob>>, transfer_id: &str, file_id: &str, chunk_id: &str) {
  let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
  let file = transfer.files.iter_mut().find(|f| f._id == file_id).unwrap();
  let block = file.blocks.iter_mut().find(|b| b._id == chunk_id).unwrap();
  file.status = JobStatus::Progress;
  transfer.status = JobStatus::Progress;
  block.status = JobStatus::Completed;
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