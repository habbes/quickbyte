use serde::{Serialize, Deserialize};

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum JobStatus {
  Pending,
  Progress,
  Completed,
  Cancelled,
  Error
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