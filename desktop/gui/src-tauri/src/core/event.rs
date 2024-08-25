use super::dtos::{TransferJob, TransferJobFile};


#[derive(Debug, Clone)]
pub enum Event {
  TransferCreated(TransferJob),
  Transfers(Vec<TransferJob>)
}

#[derive(Debug)]
pub enum FileTransferUpdate {
  ChunkCompleted { size: u64 },
  FileCompleted {},
  FileCancelled {},
  FileError { error: String }
}