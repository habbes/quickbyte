use azure_storage_blobs::prelude::BlobClient;
use std::{fs::File, io::Write, os::unix::fs::FileExt, sync::Arc};
use tokio::task;
use futures::stream::StreamExt;
use std::time::Instant;

use super::dtos::{TransferJob, TransferJobFile };

pub struct SharedLinkDownloader<'a> {
    request: &'a TransferJob
}

impl SharedLinkDownloader<'_> {
    pub fn new(request: &TransferJob) -> SharedLinkDownloader {
        SharedLinkDownloader {
            request,
        }
    }

    pub async fn start_download(&self, id: String) {
        let files = &self.request.files;
        println!("Init download of {}", files.len());
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

        println!("Finihed download job");
    }
}

struct FileDownloader {
    file_job: TransferJobFile,
}

impl FileDownloader {
    pub fn new(file: TransferJobFile) -> FileDownloader {
        FileDownloader {
            file_job: file
        }
    }

    pub async fn start_download(&self) {
        
        // create file
        println!("Start download for file {}", self.file_job.name);
        let started_file = Instant::now();
        let file_path = std::path::Path::new(&self.file_job.local_path);
        let directory = file_path.parent().unwrap();
        std::fs::create_dir_all(directory).unwrap();
        let file = File::create(std::path::Path::new(&self.file_job.local_path)).unwrap();
        // set file len on disk
        file.set_len(self.file_job.size).unwrap();

        let mut file = Arc::new(file);

        let num_chunks = get_num_chunks(self.file_job.size, self.file_job.chunk_size);
        let url = url::Url::parse(&self.file_job.remote_url).unwrap();
        let blob = BlobClient::from_sas_url(&url).unwrap();
        let chunk_size = self.file_job.chunk_size;
        let file_size = self.file_job.size;
        let mut tasks = Vec::new();
        let file_name = Arc::new(self.file_job.name.clone());
        println!("Need {} chunks for file {}", num_chunks, self.file_job.name);
        for i in 0..num_chunks {
            let blob = blob.clone();
            let file = Arc::clone(&file);
            let file_name = Arc::clone(&file_name);
            let task = task::spawn(async move {
                let start_range: u64 = i as u64 * chunk_size as u64;
                let end_range = (start_range + chunk_size as u64).min(file_size);
                let mut stream = blob
                    .get()
                    .range(start_range..end_range)
                    .chunk_size(chunk_size)
                    .into_stream();
                
                // println!("Writing chunk {} of file {}", i, file_name);
                let mut chunk_progress = 0 as u64;
                let chunk_timer = Instant::now();
                while let Some(value) = stream.next().await {
                    let mut body = value.unwrap().data;
                    // For each response, we stream the body instead of collecting it all
                    // into one large allocation.
                    // This also let's us calculate progress more granularly
                    while let Some(value) = body.next().await {
                        let value = value.unwrap();
                        // println!("Got stream item of size {} for chunk {}", value.len(), i);
                        file.write_all_at(&value, start_range + chunk_progress).unwrap();
                        chunk_progress += value.len() as u64;
                    }
                }

                // println!("Finished writing chunk {} of file {} after {}s", i, file_name, chunk_timer.elapsed().as_secs_f64());
                    
                Ok::<(), azure_core::Error>(())
            });

            tasks.push(task);
        }

        for task in tasks {
            let _ = task.await.unwrap();
        }

        println!("Finish downloading file {} after {}s. Flushing...", self.file_job.name, started_file.elapsed().as_secs_f64());
        file.flush().unwrap();
        println!("Completed flushing file {} after {}s", self.file_job.name, started_file.elapsed().as_secs_f64());
    }
}

fn get_num_chunks(file_size: u64, chunk_size: u64) -> u64{
    assert!(file_size > 0);
    assert!(chunk_size > 0);

    // Calculate the number of chunks, rounding up
    (file_size + chunk_size - 1) / chunk_size
}