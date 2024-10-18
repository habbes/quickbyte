use super::message_channel::MessageChannel;
use super::request::DownloadFilesRequest;
use super::transfer_cancellation_tracker::TransferCancellationTrackerCollection;
use super::{
    downloader::TransferDownloader, dtos::*, event::Event, message_channel::SyncMessageChannel,
    models::JobStatus, request::Request, transfer_queue::BlockTransferQueue, uploader::*,
    util::get_num_chunks,
};
use std::sync::Arc;
use tokio::sync::Mutex;

const CONCURRENCY: u32 = 32;

#[derive(Debug)]
pub struct TransferManager {
    events: Arc<MessageChannel<Event>>,
    chunk_size: u64,
    transfers: Arc<Mutex<Vec<TransferJob>>>,
    cancellation_trackers: std::sync::RwLock<TransferCancellationTrackerCollection>,
    db_sync_channel: Arc<SyncMessageChannel<Event>>,
    transfer_queue: Arc<BlockTransferQueue>,
}

impl TransferManager {
    pub fn new(
        events: MessageChannel<Event>,
        db_sync_channel: Arc<SyncMessageChannel<Event>>,
    ) -> Self {
        Self {
            events: Arc::new(events),
            chunk_size: 0x1000 * 0x1000, // 16MB
            transfers: Arc::new(Mutex::new(vec![])),
            db_sync_channel,
            transfer_queue: Arc::new(BlockTransferQueue::init(CONCURRENCY as usize)),
            cancellation_trackers: std::sync::RwLock::new(
                TransferCancellationTrackerCollection::new(),
            ),
        }
    }

    pub async fn execute_request(&self, request: Request) {
        match request {
            Request::DownloadFiles(download_request) => self.start_download(download_request).await,
            Request::UploadFiles(upload_reqiest) => self.start_upload(upload_reqiest).await,
            Request::ResumeTransfer(transfer) => self.resume_tranfer(transfer).await,
            Request::GetTransfers => self.broadcast_transfers().await,
            Request::DeleteTransfer { transfer_id } => self.delete_transfer(&transfer_id).await,
            Request::CancelTransferFile(request) => self.cancel_transfer_file(request).await,
        }
    }

    pub async fn broadcast_transfers(&self) {
        self.events
            .send(Event::Transfers((*self.transfers.lock().await).clone()))
            .await;
    }

    pub async fn delete_transfer(&self, transfer_id: &str) {
        let mut transfers = self.transfers.lock().await;
        let index = transfers.iter().position(|t| t._id == transfer_id);
        if let Some(index) = index {
            transfers.remove(index);
            self.events
                .send(Event::TransferDeleted {
                    transfer_id: String::from(transfer_id),
                })
                .await;
            self.db_sync_channel.send(Event::TransferDeleted {
                transfer_id: String::from(transfer_id),
            });
        }

        self.cancellation_trackers
            .write()
            .unwrap()
            .remove_job(transfer_id);
    }

    pub async fn cancel_transfer_file(&self, request: CancelTransferFileRequest) {
        self.cancellation_trackers
            .write()
            .unwrap()
            .cancel_file(&request.transfer_id, &request.file_id)
            .expect("Failed to cancel transfer");

        // TODO update file status in in-memory and persistent db
        let mut transfers = self.transfers.lock().await;
        if let Some(transfer) = transfers.iter_mut().find(|t| t._id == request.transfer_id) {
            if let Some(f) = transfer.files.iter_mut().find(|f| f._id == request.file_id) {
                f.status = JobStatus::Cancelled;
            }
        }

        self.db_sync_channel.send(Event::TransferFileStatusUpdate {
            file_id: request.file_id.clone(),
            transfer_id: request.transfer_id.clone(),
            status: JobStatus::Cancelled,
            error: None,
        });

        self.events.send(Event::Transfers(transfers.clone())).await;
    }

    pub async fn resume_tranfer(&self, transfer: TransferJob) {
        {
            self.transfers.lock().await.push(transfer.clone()); // TODO: avoid unnecessary cloning
            self.cancellation_trackers
                .write()
                .unwrap()
                .add_job(&transfer);
        }

        if transfer.status != JobStatus::Pending && transfer.status != JobStatus::Progress {
            return;
        }

        self.events
            .send(Event::TransferCreated(transfer.clone()))
            .await;
        match transfer.transfer_kind {
            TransferKind::Download => self.run_download(&transfer).await,
            TransferKind::Upload => self.run_upload(&transfer).await,
        }
    }

    pub async fn start_download(&self, request: DownloadFilesRequest) {
        let job = match request {
            DownloadFilesRequest::FromSharedLink(shared_link_request) => {
                self.init_download_job_from_project_share_link(&shared_link_request)
            }
            DownloadFilesRequest::FromLegacyTransferLink(legacy_transfer_request) => {
                self.init_download_job_from_legacy_transfer_link(&legacy_transfer_request)
            }
        };

        let cloned_job = job.clone(); // TODO: try to get reference or at least move to heap instead of sharing
        {
            let mut transfers = self.transfers.lock().await;
            transfers.push(job);
        };

        self.cancellation_trackers
            .write()
            .unwrap()
            .add_job(&cloned_job);

        self.events
            .send(Event::TransferCreated(cloned_job.clone()))
            .await;
        self.db_sync_channel
            .send(Event::TransferCreated(cloned_job.clone()));

        let cancellation_tracker = self.cancellation_trackers
            .read()
            .unwrap()
            .get_transfer_cancellation_tracker(&cloned_job._id)
            .expect("Failed to get cancellation tracker");
        let downloader = TransferDownloader::new(&cloned_job, cancellation_tracker);
        let transfers = Arc::clone(&(self.transfers));
        let events = Arc::clone(&self.events);
        let db_sync_channel = Arc::clone(&self.db_sync_channel);
        let job_updates: MessageChannel<TransferUpdate> =
            MessageChannel::new(move |update: TransferUpdate| {
                // handle_transfer_update(Arc::clone(&transfers), update);
                let transfers = Arc::clone(&transfers);
                let events = Arc::clone(&events);
                let db_sync_channel = Arc::clone(&db_sync_channel);
                tokio::spawn(async move {
                    handle_transfer_update(
                        Arc::clone(&transfers),
                        &update,
                        Arc::clone(&events),
                        Arc::clone(&db_sync_channel),
                    )
                    .await;
                });
            });
        let job_updates = Arc::new(job_updates);
        downloader
            .start_download(self.transfer_queue.clone(), job_updates)
            .await;
    }

    pub async fn run_download(&self, job: &TransferJob) {
        let cancellation_tracker = self.cancellation_trackers
            .read()
            .unwrap()
            .get_transfer_cancellation_tracker(&job._id)
            .expect("Could not get cancellation tracker for job");

        let downloader = TransferDownloader::new(&job, cancellation_tracker);
        let transfers = Arc::clone(&(self.transfers));
        let events = Arc::clone(&self.events);
        let db_sync_channel = Arc::clone(&self.db_sync_channel);
        let job_updates: MessageChannel<TransferUpdate> =
            MessageChannel::new(move |update: TransferUpdate| {
                // handle_transfer_update(Arc::clone(&transfers), update);
                let transfers = Arc::clone(&transfers);
                let events = Arc::clone(&events);
                let db_sync_channel = Arc::clone(&db_sync_channel);
                tokio::spawn(async move {
                    handle_transfer_update(
                        Arc::clone(&transfers),
                        &update,
                        Arc::clone(&events),
                        Arc::clone(&db_sync_channel),
                    )
                    .await;
                });
            });
        let job_updates = Arc::new(job_updates);
        downloader
            .start_download(self.transfer_queue.clone(), job_updates)
            .await;
    }

    pub async fn start_upload(&self, request: UploadFilesRequest) {
        let job = self.init_upload_job(&request);
        let cloned_job = job.clone();
        {
            let mut transfers = self.transfers.lock().await;
            transfers.push(job);
        }

        self.cancellation_trackers
            .write()
            .unwrap()
            .add_job(&cloned_job);

        self.events
            .send(Event::TransferCreated(cloned_job.clone()))
            .await;
        self.db_sync_channel
            .send(Event::TransferCreated(cloned_job.clone()));

        let uploader = TransferUploader::new(&cloned_job, self.transfer_queue.clone());
        let transfers = Arc::clone(&(self.transfers));
        let events = Arc::clone(&self.events);
        let db_sync_channel = Arc::clone(&self.db_sync_channel);
        let job_updates: MessageChannel<TransferUpdate> =
            MessageChannel::new(move |update: TransferUpdate| {
                // handle_transfer_update(Arc::clone(&transfers), update);
                let transfers = Arc::clone(&transfers);
                let events = Arc::clone(&events);
                let db_sync_channel = Arc::clone(&db_sync_channel);
                tokio::spawn(async move {
                    handle_transfer_update(
                        Arc::clone(&transfers),
                        &update,
                        Arc::clone(&events),
                        Arc::clone(&db_sync_channel),
                    )
                    .await;
                });
            });
        let job_updates = Arc::new(job_updates);
        uploader.start_upload(job_updates).await;
    }

    async fn run_upload(&self, job: &TransferJob) {
        let uploader = TransferUploader::new(job, self.transfer_queue.clone());
        let transfers = Arc::clone(&(self.transfers));
        let events = Arc::clone(&self.events);
        let db_sync_channel = Arc::clone(&self.db_sync_channel);
        let job_updates: MessageChannel<TransferUpdate> =
            MessageChannel::new(move |update: TransferUpdate| {
                // handle_transfer_update(Arc::clone(&transfers), update);
                let transfers = Arc::clone(&transfers);
                let events = Arc::clone(&events);
                let db_sync_channel = Arc::clone(&db_sync_channel);
                tokio::spawn(async move {
                    handle_transfer_update(
                        Arc::clone(&transfers),
                        &update,
                        Arc::clone(&events),
                        Arc::clone(&db_sync_channel),
                    )
                    .await;
                });
            });
        let job_updates = Arc::new(job_updates);
        uploader.start_upload(job_updates).await;
    }

    fn init_download_job_from_project_share_link(
        &self,
        request: &SharedLinkDownloadRequest,
    ) -> TransferJob {
        let files: Vec<TransferJobFile> = request
            .files
            .iter()
            .map(|f| TransferJobFile {
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
                blocks: init_file_blocks(f.size, self.chunk_size),
            })
            .collect();

        let job = TransferJob {
            _id: uuid::Uuid::new_v4().to_string(),
            name: request.name.clone(),
            total_size: files.iter().map(|f| f.size).sum(),
            completed_size: 0,
            num_files: files.len(),
            local_path: request.target_path.clone(),
            files: files,
            transfer_kind: TransferKind::Download,
            upload_transfer_id: None,
            download_type: Some(DownloadType::ProjectShare),
            share_code: Some(request.share_code.clone()),
            share_id: Some(request.share_id.clone()),
            share_password: None,
            download_transfer_id: None,
            status: JobStatus::Pending,
            error: None,
        };

        job
    }

    fn init_download_job_from_legacy_transfer_link(
        &self,
        request: &LegacyTransferLinkDownloadRequest,
    ) -> TransferJob {
        let files: Vec<TransferJobFile> = request
            .files
            .iter()
            .map(|f| TransferJobFile {
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
                blocks: init_file_blocks(f.size, self.chunk_size),
            })
            .collect();

        let job = TransferJob {
            _id: uuid::Uuid::new_v4().to_string(),
            name: request.name.clone(),
            total_size: files.iter().map(|f| f.size).sum(),
            completed_size: 0,
            num_files: files.len(),
            local_path: request.target_path.clone(),
            files: files,
            transfer_kind: TransferKind::Download,
            upload_transfer_id: None,
            download_type: Some(DownloadType::LegacyTransfer),
            share_code: None,
            share_id: None,
            share_password: None,
            download_transfer_id: Some(request.transfer_id.clone()),
            status: JobStatus::Pending,
            error: None,
        };

        job
    }

    fn init_upload_job(&self, request: &UploadFilesRequest) -> TransferJob {
        let files: Vec<TransferJobFile> = request
            .files
            .iter()
            .map(|f| TransferJobFile {
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
                blocks: init_file_blocks(f.transfer_file.size, self.chunk_size),
            })
            .collect();

        let job = TransferJob {
            _id: uuid::Uuid::new_v4().to_string(),
            name: request.name.clone(),
            total_size: files.iter().map(|f| f.size).sum(),
            completed_size: 0,
            num_files: files.len(),
            local_path: request.local_path.clone(),
            files: files,
            transfer_kind: TransferKind::Upload,
            upload_transfer_id: Some(request.transfer_id.clone()),
            download_type: None,
            share_code: None,
            share_id: None,
            share_password: None,
            download_transfer_id: None,
            status: JobStatus::Pending,
            error: None,
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
            status: JobStatus::Pending,
        })
    }

    blocks
}

async fn handle_transfer_update(
    transfers: Arc<Mutex<Vec<TransferJob>>>,
    update: &TransferUpdate,
    events: Arc<MessageChannel<Event>>,
    db_sync_channel: Arc<SyncMessageChannel<Event>>,
) {
    let mut transfers = transfers.lock().await;
    match update {
        TransferUpdate::ChunkProgress {
            chunk_index: _,
            chunk_id: _,
            size,
            file_id,
            transfer_id,
        } => {
            // let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
            // let file = transfer.files.iter_mut().find(|f| f._id == file_id).unwrap();
            // file.completed_size += file.size;
            // file.status = JobStatus::Completed;
            // transfer.status = JobStatus::Progress;
            handle_chunk_progress(&mut transfers, transfer_id, file_id, *size);
        }
        TransferUpdate::ChunkCompleted {
            chunk_index,
            chunk_id,
            file_id,
            transfer_id,
        } => {
            handle_chunk_completed(&mut transfers, transfer_id, file_id, chunk_id.as_str());
            db_sync_channel.send(Event::TransferFileBlockStatusUpdate {
                block_id: chunk_id.clone(),
                file_id: file_id.clone(),
                status: JobStatus::Completed,
                error: None,
            });
        }
        TransferUpdate::FileCompleted {
            file_id,
            transfer_id,
        } => {
            handle_file_completed(&mut transfers, transfer_id, file_id);

            db_sync_channel.send(Event::TransferFileStatusUpdate {
                file_id: file_id.clone(),
                transfer_id: transfer_id.clone(),
                status: JobStatus::Completed,
                error: None,
            });

            let transfer = transfers
                .iter()
                .find(|t| t._id.as_str() == transfer_id)
                .unwrap();
            if transfer.transfer_kind == TransferKind::Upload && transfer.upload_transfer_id != None
            {
                let file = transfer
                    .files
                    .iter()
                    .find(|f| f._id.as_str() == file_id)
                    .unwrap();

                events
                    .send(Event::TransferFileUploadComplete {
                        transfer_id: transfer_id.clone(),
                        remote_transfer_id: transfer.upload_transfer_id.clone().unwrap(),
                        file_id: file_id.clone(),
                        remote_file_id: file.remote_file_id.clone(),
                    })
                    .await;
            }
        }
        TransferUpdate::FileFailed {
            file_id,
            transfer_id,
            error,
        } => {
            handle_file_failed(&mut transfers, &transfer_id, file_id, error.clone());

            db_sync_channel.send(Event::TransferFileStatusUpdate {
                file_id: file_id.clone(),
                transfer_id: transfer_id.clone(),
                status: JobStatus::Error,
                error: Some(error.clone()),
            });
        },
        TransferUpdate::FileCancelled {
            file_id,
            transfer_id
        } => {
            // Since transfers and files are marked as cancelled
            // before cancellation request is sent to the downloaders/uploaders
            // we don't need to handle cancellation again here since the UI and DB
            // are already updated.
        } ,
        TransferUpdate::TransferCompleted { transfer_id } => {
            handle_transfer_completed(&mut transfers, transfer_id);
            // let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
            // transfer.status = JobStatus::Completed;
            db_sync_channel.send(Event::TransferStatusUpdate {
                transfer_id: transfer_id.clone(),
                status: JobStatus::Completed,
                error: None,
            });

            events
                .send(Event::TransferCompleted(
                    transfers
                        .iter()
                        .find(|t| &t._id == transfer_id)
                        .unwrap()
                        .clone(),
                ))
                .await;
        }
    }

    events.send(Event::Transfers(transfers.clone())).await;
}

fn handle_chunk_progress(
    transfers: &mut tokio::sync::MutexGuard<Vec<TransferJob>>,
    transfer_id: &str,
    file_id: &str,
    chunk_size: u64,
) {
    let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
    let file = transfer
        .files
        .iter_mut()
        .find(|f| f._id == file_id)
        .unwrap();
    file.completed_size += chunk_size;
    file.status = JobStatus::Progress;
    transfer.status = JobStatus::Progress;
}

fn handle_chunk_completed(
    transfers: &mut tokio::sync::MutexGuard<Vec<TransferJob>>,
    transfer_id: &str,
    file_id: &str,
    chunk_id: &str,
) {
    let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
    let file = transfer
        .files
        .iter_mut()
        .find(|f| f._id == file_id)
        .unwrap();
    let block = file
        .blocks
        .iter_mut()
        .find(|b| b._id == chunk_id)
        .expect(format!("Block {chunk_id} not found for file {file_id}.").as_str());
    file.status = JobStatus::Progress;
    transfer.status = JobStatus::Progress;
    block.status = JobStatus::Completed;
}

fn handle_file_completed(
    transfers: &mut tokio::sync::MutexGuard<Vec<TransferJob>>,
    transfer_id: &str,
    file_id: &str,
) {
    let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
    let file = transfer
        .files
        .iter_mut()
        .find(|f| f._id == file_id)
        .unwrap();
    file.completed_size = file.size;
    file.status = JobStatus::Completed;
    transfer.status = JobStatus::Progress;
}

fn handle_file_failed(
    transfers: &mut tokio::sync::MutexGuard<Vec<TransferJob>>,
    transfer_id: &str,
    file_id: &str,
    error: String,
) {
    let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
    let file = transfer
        .files
        .iter_mut()
        .find(|f| f._id == file_id)
        .unwrap();
    file.status = JobStatus::Error;
    file.error = Some(error);
    transfer.status = JobStatus::Progress;
}

fn handle_transfer_completed(
    transfers: &mut tokio::sync::MutexGuard<Vec<TransferJob>>,
    transfer_id: &str,
) {
    // let mut transfers = self.transfers.lock().await;
    let transfer = transfers.iter_mut().find(|t| t._id == transfer_id).unwrap();
    transfer.status = JobStatus::Completed;
}
