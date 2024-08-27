use azure_storage_blobs::{blob::{BlobBlockType, BlockList}, prelude::BlobClient};
use url::Url;
use std::{os::unix::fs::FileExt, sync::Arc, time::Instant};
use base64::prelude::*;
use super::dtos::*;
use super::util::*;


pub struct TransferUploader<'a> {
    request: &'a TransferJob
}

impl<'a> TransferUploader<'a> {
    pub fn new(request: &TransferJob) -> TransferUploader {
        TransferUploader {
            request
        }
    }

    pub async fn start_upload(&self) {
        let file_uploaders: Vec<_> = self.request.files.iter().map(|f|
            FileUploader::new(self.request._id.clone(), f.clone())).collect();

        let count = file_uploaders.len();

        println!("Start uploading {count} files");
        let timer = Instant::now();

        let mut file_upload_tasks = Vec::with_capacity(count);

        for uploader in file_uploaders {
            let task = tokio::task::spawn(async move {
                uploader.upload_file().await;
            });

            file_upload_tasks.push(task);
        }

        for task in file_upload_tasks {
            task.await.unwrap();
        }

        println!("Finished uploading {} files in {}s", count, timer.elapsed().as_secs_f64());
    }
}

struct FileUploader {
    transfer_id: String,
    file_job: TransferJobFile
}

impl FileUploader {
    pub fn new(transfer_id: String, file_job: TransferJobFile) -> Self {
        Self {
            transfer_id,
            file_job
        }
    }

    pub async fn upload_file(&self) {
        // Parse the URL and create a BlobClient
        let url = Url::parse(&self.file_job.remote_url).unwrap();
        let blob_client = Arc::new(BlobClient::from_sas_url(&url).unwrap());

        // Open the file for reading
        let file = Arc::new(std::fs::File::open(&self.file_job.local_path).unwrap());
        let num_chunks = get_num_chunks(self.file_job.size, self.file_job.chunk_size);

        println!("Uploading file {} in {} chunks", self.file_job.name, num_chunks);
        let timer = Instant::now();
        // Vector to hold all the upload tasks
        let mut upload_tasks = Vec::with_capacity(num_chunks as usize);

        for i in 0..num_chunks {
            let blob_client = Arc::clone(&blob_client);
            let file = Arc::clone(&file);
            let chunk_size = self.file_job.chunk_size;
            let offset = i * chunk_size;
            let end = std::cmp::min(offset + chunk_size, self.file_job.size);

            // Create a task for each chunk upload
            let task = tokio::task::spawn(async move {
                let mut buffer = vec![0u8; (end - offset) as usize];
                // file.seek(tokio::io::SeekFrom::Start(offset)).await?;
                file.read_exact_at(&mut buffer, offset);
                
                // Upload the block
                let block_id: Vec<_> = format!("{:032x}", i + 1).as_bytes().iter().map(|v| v.clone()).collect();
                blob_client
                    .put_block(block_id, buffer)
                    .into_future()
                    .await.unwrap();

                

                Ok::<(), azure_core::Error>(())
            });

            upload_tasks.push(task);
        }

        // Wait for all uploads to complete
        // let results = join_all(upload_tasks).await;
        for task in upload_tasks {
            task.await.unwrap();
        }

        println!("Completed {} chunks for file {} in {}s", num_chunks, self.file_job.name, timer.elapsed().as_secs_f64());

        // Check if any of the tasks failed
        // for result in results {
        //     result??;
        // }

        // Commit the block list
        
        let block_ids = (0..num_chunks)
        .map(|i| {
            let id = format!("{:032x}", i + 1);
            let bytes: Vec<_> = id.as_bytes().iter().map(|v| v.clone()).collect();
            BlobBlockType::new_uncommitted(bytes)
        })
        .collect::<Vec<_>>();

        println!("block list {:?}", block_ids);
        let block_list = BlockList {
            blocks: block_ids
        };

        blob_client
            .put_block_list(block_list)
            .into_future()
            .await.unwrap();

        println!("Completed upload for file {} in {}s", self.file_job.name, timer.elapsed().as_secs_f64());
    }
}