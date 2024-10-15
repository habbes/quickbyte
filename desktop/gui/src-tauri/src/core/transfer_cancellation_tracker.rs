use std::{collections::HashMap, ops::Deref, sync::{Arc, RwLock}};

use super::{dtos::TransferJob, error::AppError};

type FileCancellationLock = Arc<RwLock<bool>>;

#[derive(Debug)]
pub struct TransferCancellationTrackerCollection {
    locks: HashMap<String, Arc<HashMap<String, FileCancellationLock>>>
}

impl TransferCancellationTrackerCollection {
    pub fn new() -> Self {
        let locks = HashMap::new();

        Self {
            locks: locks
        }
    }

    pub fn from_jobs(jobs: &Vec<TransferJob>) -> Self {
        let mut locks = HashMap::with_capacity(jobs.len());
        for job in jobs {
            let mut file_locks = HashMap::with_capacity(job.files.len());
            for file in &job.files {
                file_locks.insert(file._id.clone(), Arc::new(RwLock::new(false)));
            }

            locks.insert(job._id.clone(), Arc::new(file_locks));
        }

        Self {
            locks
        }
    }

    pub fn add_job(&mut self, job: &TransferJob) {
        let mut file_locks = HashMap::with_capacity(job.files.len());
        for file in &job.files {
            file_locks.insert(file._id.clone(), Arc::new(RwLock::new(false)));
        }

        self.locks.insert(job._id.clone(), Arc::new(file_locks));
    }

    pub fn cancel_file(&mut self, transfer_id: &str, file_id: &str) -> Result<(), AppError> {
        let lock = self.get_file_cancellation_lock(transfer_id, file_id)?;
        let mut cancelled = lock.write().unwrap();
        *cancelled = true;

        return Err(AppError::Internal(format!("Failed to find file {file_id} of transfer {transfer_id} for cancellation")));
    }

    pub fn cancel_transfer(&mut self, transfer_id: &str) -> Result<(), AppError> {
        if let Some(file_locks) = self.locks.get(transfer_id) {
            for (_, lock) in file_locks.deref() {
                let mut cancelled = lock.write().unwrap();
                *cancelled = true;
            }
            
            return Ok(());
        }

        Err(AppError::Internal(format!("Failed to find {transfer_id} for cancellation")))
    }

    pub fn get_transfer_cancellation_tracker(&self, transfer_id: &str) -> Result<TransferCancellationTracker, AppError> {
        let locks = self.get_transfer_cancellation_locks(transfer_id)?;

        Ok(TransferCancellationTracker {
            locks: locks
        })
    }

    fn get_transfer_cancellation_locks(&self, transfer_id: &str) -> Result<Arc<HashMap<String, FileCancellationLock>>, AppError> {
        if let Some(file_locks) = self.locks.get(transfer_id) {
            return Ok(file_locks.clone());
        }

        Err(AppError::Internal(format!("Failed to transfer {transfer_id} for cancellation")))
    }

    fn get_file_cancellation_lock(&self, transfer_id: &str, file_id: &str) -> Result<Arc<RwLock<bool>>, AppError> {
        if let Some(file_locks) = self.locks.get(transfer_id) {
            if let Some(lock) = file_locks.get(file_id) {
                return Ok(lock.clone());
            }
        }

        return Err(AppError::Internal(format!("Failed to find file {file_id} of transfer {transfer_id} for cancellation")));
    }
}

pub struct TransferCancellationTracker {
    locks: Arc<HashMap<String, Arc<RwLock<bool>>>>
}

impl TransferCancellationTracker {
    pub fn get_file_cancellation_tracker(&self, file_id: &str) -> Result<FileCancellationTracker, AppError> {
        if let Some(lock) = self.locks.get(file_id) {
            return Ok(
                FileCancellationTracker {
                    lock: lock.clone()
                }
            );
        }

        Err(AppError::Internal(format!("Failed to find file {file_id}for cancellation")))
    }
}

#[derive(Clone)]
pub struct FileCancellationTracker {
    lock: Arc<RwLock<bool>>,
}

impl FileCancellationTracker {
    pub fn is_cancelled(&self) -> bool {
        let cancelled = self.lock.read().unwrap();
        *cancelled
    }
}