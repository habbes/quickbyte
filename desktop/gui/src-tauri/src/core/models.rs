use serde::{Serialize, Deserialize};

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Copy)]
#[serde(rename_all = "camelCase")]
pub enum JobStatus {
  Pending,
  Progress,
  Completed,
  Cancelled,
  Error
}

impl JobStatus {
  pub fn is_active(self) -> bool {
    !self.is_terminal()
  }

  pub fn is_terminal(self) -> bool {
    self == JobStatus::Cancelled || self == JobStatus::Completed || self == JobStatus::Error
  }
}

impl Into<&'static str> for JobStatus {
  fn into(self) -> &'static str {
    (&self).into()
  }
}

impl Into<&'static str> for &JobStatus {
  fn into(self) -> &'static str {
    match self {
      JobStatus::Pending => "pending",
      JobStatus::Cancelled => "cancelled",
      JobStatus::Completed => "completed",
      JobStatus::Error => "error",
      JobStatus::Progress => "progress"
    }
  }
}

impl Into<String> for JobStatus {
  fn into(self) -> String {
    let s: &str = (&self).into();
    String::from(s)
  }
}

impl From<String> for JobStatus {
  fn from(value: String) -> Self {
    value.as_str().into()
  }
}

impl From<&str> for JobStatus {
  fn from(value: &str) -> Self {
    if value == "pending" {
      JobStatus::Pending
    } else if value == "cancelled" {
      JobStatus::Cancelled
    } else if value == "completed" {
      JobStatus::Completed
    } else if value == "error" {
      JobStatus::Error
    } else {
      // TODO: error if unknown type
      JobStatus::Progress
    }
  }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
  pub name: String,
  pub version: String,
  pub server_base_url: String,
}

pub struct DownloadJob {
  pub id: i32,
  pub share_id: String,
  pub share_code: String,
  pub name: String,
  pub target_path: String,
  pub started_at: Option<String>, // TODO date/timestamp
  pub completed_at: Option<String>, // TODO date/timestamp
  pub status: JobStatus,
  pub error: Option<String>
}

#[derive(Clone)]
pub struct DownloadFileJob {
  pub id: i32,
  pub download_job_id: i32,
  pub file_id: String,
  pub name: String,
  pub target_path: String,
  pub file_size: u64,
  pub chunk_size: u32,
  pub status: JobStatus,
  pub download_url: String,
  pub storage_handler: Option<String>,
  pub started_at: Option<String>,
  pub completed_at: Option<String>,
  pub error: Option<String>,
}

impl DownloadFileJob {
  pub fn get_num_chunks(&self) -> u32 {
    assert!(self.file_size > 0);
    assert!(self.chunk_size > 0);

    // Calculate the number of chunks, rounding up
    ((self.file_size + self.chunk_size as u64 - 1) / self.chunk_size as u64) as u32
  }
}

pub struct DownloadFileChunk {
  id: i32,
  download_file_job_id: i32,
  chunk_number: u32,
  chunk_size: u32,
  started_at: Option<String>,
  completed_at: Option<String>
}