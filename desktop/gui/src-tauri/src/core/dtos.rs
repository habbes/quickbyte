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
  pub _id: String,
  pub transfer_id: String,
  pub name: String,
  pub size: u64,
  pub account_id: String,
  pub download_url: String,
  #[serde(rename = "_createdAt")]
  pub _created_at: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SharedLinkDownloadRequest {
    pub share_id: String,
    pub share_code: String,
    pub name: String,
    pub target_path: String,
    pub files: Vec<ShareDownloadFile>,
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

#[derive(Debug)]
pub enum TransferUpdate {
    ChunkCompleted {
        chunk_index: u64,
        chunk_id: String,
        size: u64,
        file_id: String,
        transfer_id: String
    },
    FileCompleted {
        file_id: String,
        transfer_id: String
    },
    TransferCompleted {
        transfer_id: String,
    }
}
