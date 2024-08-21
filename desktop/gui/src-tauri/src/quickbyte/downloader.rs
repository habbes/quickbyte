use azure_storage_blobs::prelude::BlobClient;
use serde::{Serialize, Deserialize};
use std::{fs::File, io::Write, os::unix::fs::FileExt, sync::Arc};
use tokio::task;
use crate::quickbyte::models::{DownloadJob,DownloadFileJob, JobStatus};
use futures::stream::StreamExt;


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

pub struct SharedLinkDownloader<'a> {
    request: &'a SharedLinkDownloadRequest,
    chunk_size: u32,
}

impl SharedLinkDownloader<'_> {
    pub fn new(request: &SharedLinkDownloadRequest) -> SharedLinkDownloader {
        SharedLinkDownloader {
            request,
            chunk_size: 0x1000 * 0x1000, // 16MB
        }
    }

    pub async fn start_download(&self) {
        // create create download job record
        let (_, files) = self.init_download_job();
        // create file download handler for each file
        let file_downloaders: Vec<_> = files.iter().map(|f| FileDownloader::new(f.clone())).collect();
        // initialize the handlers to persist records
        // run the downloaders concurrently, limiting concurrency
        let mut tasks = Vec::with_capacity(file_downloaders.len());
        for downloader in file_downloaders {
            let task = task::spawn(async move {
                // Call `az_download_file` and handle errors within the task
                downloader.start_download().await;
            });
            tasks.push(task);
        }
        // register progress update handler

        for task in tasks {
            task.await.unwrap();
        }
    }

    fn init_download_job(&self) -> (DownloadJob, Vec<DownloadFileJob>) {
        let job = DownloadJob {
            id: 0,
            share_id: self.request.share_id.clone(),
            share_code: self.request.share_code.clone(),
            name: self.request.name.clone(),
            target_path: self.request.target_path.clone(),
            status: JobStatus::Pending,
            started_at: None,
            completed_at: None,
            error: None
        };

        let files: Vec<DownloadFileJob> = self.request.files.iter().map(|f| DownloadFileJob {
            id: 0,
            file_id: f._id.clone(),
            download_job_id: job.id,
            name: f.name.clone(),
            target_path: job.target_path.clone() + "/" + f.name.as_str(),
            download_url: f.download_url.clone(),
            storage_handler: Some(String::from("az")),
            file_size: f.size,
            chunk_size: self.chunk_size,
            status: JobStatus::Pending,
            started_at: None,
            completed_at: None,
            error: None
        }).collect();

        (job, files)
    }
}

struct FileDownloader {
    file_job: DownloadFileJob,
}

impl FileDownloader {
    pub fn new(file: DownloadFileJob) -> FileDownloader {
        FileDownloader {
            file_job: file
        }
    }

    pub async fn start_download(&self) {
        
        // create file
        println!("Start download for file {}", self.file_job.name);
        let file = File::create(std::path::Path::new(&self.file_job.target_path)).unwrap();
        // set file len on disk
        file.set_len(self.file_job.file_size).unwrap();

        let mut file = Arc::new(file);

        let num_chunks = self.file_job.get_num_chunks();
        let url = url::Url::parse(&self.file_job.download_url).unwrap();
        let blob = BlobClient::from_sas_url(&url).unwrap();
        let chunk_size = self.file_job.chunk_size;
        let file_size = self.file_job.file_size;
        let mut tasks = Vec::new();
        for i in 0..num_chunks {
            let blob = blob.clone();
            let file = Arc::clone(&file);
            let task = task::spawn(async move {
                let start_range: u64 = i as u64 * chunk_size as u64;
                let end_range = (start_range + chunk_size as u64).min(file_size);
                let mut stream = blob
                    .get()
                    .range(start_range..end_range)
                    .chunk_size(chunk_size)
                    .into_stream();
                
                while let Some(value) = stream.next().await {
                    let mut body = value.unwrap().data;
                    // For each response, we stream the body instead of collecting it all
                    // into one large allocation.
                    while let Some(value) = body.next().await {
                        let value = value.unwrap();
                        file.write_all_at(&value, start_range).unwrap();
                    }
                }
                    
                Ok::<(), azure_core::Error>(())
            });

            tasks.push(task);
        }

        for task in tasks {
            let _ = task.await.unwrap();
        }

        println!("Finish downloading file {}. Flushing...", self.file_job.name);
        file.flush().unwrap();
        println!("Completed flushing file {}", self.file_job.name);
    }
}
