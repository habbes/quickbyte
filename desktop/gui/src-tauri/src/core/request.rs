use crate::core::dtos::*;

#[derive(Debug)]
pub enum Request {
    DownloadFiles(DownloadFilesRequest),
    UploadFiles(UploadFilesRequest),
    ResumeTransfer(TransferJob),
    GetTransfers,
    DeleteTransfer { transfer_id: String },
    CancelTransferFile(CancelTransferFileRequest)
}

#[derive(Debug)]
pub enum DownloadFilesRequest {
    FromSharedLink(SharedLinkDownloadRequest),
    FromLegacyTransferLink(LegacyTransferLinkDownloadRequest)
}

