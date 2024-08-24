use crate::core::dtos::*;

#[derive(Debug)]
pub enum Request {
    DownloadSharedLink(SharedLinkDownloadRequest),
}