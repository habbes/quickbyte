use serde::{Serialize, Deserialize};

use super::models::JobStatus;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub enum TransferKind {
    Upload,
    Download
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ShareDownloadFile {
  #[serde(rename = "_id")] // The camel case rename removes even leading _
  _id: String,
  transfer_id: String,
  name: String,
  size: u64,
  account_id: String,
  download_url: String,
  #[serde(rename = "_createdAt")]
  _created_at: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SharedLinkDownloadRequest {
    share_id: String,
    share_code: String,
    name: String,
    target_path: String,
    files: Vec<ShareDownloadFile>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TransferJob {
    #[serde(rename = "_id")]
    pub _id: String,
    pub name: String,
    pub total_size: u64,
    pub completed_size: u64,
    pub num_files: usize,
    pub status: JobStatus,
    pub error: Option<String>,
    #[serde(rename = "type")]
    pub transfer_kind: TransferKind,
    pub local_path: String,
    pub files: Vec<TransferJobFile>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TransferJobFile {
    #[serde(rename = "_id")]
    pub _id: String,
    pub name: String,
    pub size: u64,
    pub completed_size: u64,
    pub remote_url: String,
    pub local_path: String,
    pub status: JobStatus,
    pub error: Option<String>,
    #[serde(skip_serializing)]
    pub chunk_size: u64
}