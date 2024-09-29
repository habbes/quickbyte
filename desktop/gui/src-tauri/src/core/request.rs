use crate::core::dtos::*;

#[derive(Debug)]
pub enum Request {
    DownloadFiles(DownloadFilesRequest),
    UploadFiles(UploadFilesRequest),
    ResumeTransfer(TransferJob),
    GetTransfers
}

#[derive(Debug)]
pub enum DownloadFilesRequest {
    FromSharedLink(SharedLinkDownloadRequest),
    FromLegacyTransferLink(LegacyTransferLinkDownloadRequest)
}

