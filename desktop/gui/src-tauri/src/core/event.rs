use super::dtos::{TransferJob, TransferJobFile};
use super::models::JobStatus;


#[derive(Debug, Clone)]
pub enum Event {
  TransferCreated(TransferJob),
  TransferCompleted(TransferJob),
  TransferStatusUpdate {
    transfer_id: String,
    status: JobStatus,
    error: Option<String>
  },
  TransferFileStatusUpdate {
    file_id: String,
    status: JobStatus,
    error: Option<String>
  },
  TransferFileBlockStatusUpdate {
    block_id: String,
    file_id: String,
    status: JobStatus,
    error: Option<String>
  },
  Transfers(Vec<TransferJob>)
}

#[derive(Debug)]
pub enum FileTransferUpdate {
  ChunkCompleted { size: u64 },
  FileCompleted {},
  FileCancelled {},
  FileError { error: String }
}