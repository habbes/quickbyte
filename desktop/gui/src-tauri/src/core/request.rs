use crate::core::dtos::*;

#[derive(Debug)]
pub enum Request {
    DownloadSharedLink(SharedLinkDownloadRequest),
    DownloadLegacyTransferLink(LegacyTransferLinkDownloadRequest),
    UploadFiles(UploadFilesRequest),
    ResumeTransfer(TransferJob),
    GetTransfers
}

