use serde::{Serialize, Deserialize};

use super::models::JobStatus;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum TransferKind {
    Upload,
    Download
}

impl Into<&'static str> for &TransferKind {
  fn into(self) -> &'static str {
    match self {
      TransferKind::Upload => "upload",
      TransferKind::Download => "download",
    }
  }
}

impl From<String> for TransferKind {
    fn from(value: String) -> Self {
        value.as_str().into()
    }
}

impl From<&str> for TransferKind {
    fn from(value: &str) -> Self {
        match value {
          "upload" => Self::Upload,
          "download" => Self::Download,
          _ => panic!("Unable to decode transfer kind {value}. Database is potentially corrupted.")
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum DownloadType {
  LegacyTransfer,
  ProjectShare
}

impl Into<&'static str> for &DownloadType {
    fn into(self) -> &'static str {
      match self {
        DownloadType::LegacyTransfer => "legacyTransfer",
        DownloadType::ProjectShare => "projectShare"
      }
    }
}

impl From<String> for DownloadType {
  fn from(value: String) -> Self {
    value.as_str().into()
  }
}

impl From<&str> for DownloadType {
    fn from(value: &str) -> Self {
        match value {
          "legacyTransfer" => Self::LegacyTransfer,
          "projectShare" => Self::ProjectShare,
          _ => Self::ProjectShare // TODO: handle as error or panic
        }
    }
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

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LegacyTransferLinkDownloadRequest {
  pub transfer_id: String,
  pub download_request_id: String,
  pub name: String,
  pub target_path: String,
  pub files: Vec<ShareDownloadFile>
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UploadFilesRequest {
  pub transfer_id: String,
  pub name: String,
  pub project_id: Option<String>,
  pub folder_id: Option<String>,
  pub local_path: String,
  pub files: Vec<UploadFilesRequestFile>
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UploadFilesRequestFile {
  pub local_path: String,
  pub transfer_file: UploadFilesRequestTransferFile
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UploadFilesRequestTransferFile {
  #[serde(rename = "_id")]
  pub _id: String,
  pub name: String,
  pub size: u64,
  pub upload_url: String
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CancelTransferFileRequest {
  pub transfer_id: String,
  pub file_id: String,
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CancelTransferRequest {
  pub transfer_id: String,
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
    pub upload_transfer_id: Option<String>,
    pub download_type: Option<DownloadType>,
    pub share_id: Option<String>,
    pub share_code: Option<String>,
    pub share_password: Option<String>,
    pub download_transfer_id: Option<String>,
    pub files: Vec<TransferJobFile>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TransferJobFile {
    #[serde(rename = "_id")]
    pub _id: String,
    pub remote_file_id: String,
    pub name: String,
    pub size: u64,
    pub completed_size: u64,
    pub remote_url: String,
    pub local_path: String,
    pub status: JobStatus,
    pub error: Option<String>,
    #[serde(skip_serializing)]
    pub chunk_size: u64,
    pub blocks: Vec<TransferJobFileBlock>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TransferJobFileBlock {
  #[serde(rename = "_id")]
  pub _id: String,
  pub index: u64,
  pub status: JobStatus
}

#[derive(Debug)]
pub enum TransferUpdate {
    ChunkCompleted {
        chunk_index: u64,
        chunk_id: String,
        file_id: String,
        transfer_id: String
    },
    ChunkProgress {
      chunk_index: u64,
      chunk_id: String,
      size: u64,
      file_id: String,
      transfer_id: String
    },
    FileStarted {
      file_id: String,
      transfer_id: String
    },
    FileCompleted {
        file_id: String,
        transfer_id: String
    },
    FileFailed {
      file_id: String,
      transfer_id: String,
      error: String
    },
    FileCancelled {
      file_id: String,
      transfer_id: String
    },
    TransferCompleted {
        transfer_id: String,
    }
}
