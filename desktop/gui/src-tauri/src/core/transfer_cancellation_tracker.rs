use std::{collections::HashMap, sync::{Arc, RwLock}};

use super::{dtos::TransferJob, error::AppError};

pub struct TransferCancellationTracker {
    locks: HashMap<String, HashMap<String, Arc<RwLock<bool>>>>
}

impl TransferCancellationTracker {
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

            locks.insert(job._id.clone(), file_locks);
        }

        Self {
            locks
        }
    }

    pub fn cancel_file(&mut self, transfer_id: &str, file_id: &str) -> Result<(), AppError> {
        let lock = self.get_file_cancellation_lock(transfer_id, file_id)?;
        let mut cancelled = lock.write().unwrap();
        *cancelled = true;

        return Err(AppError::Internal(format!("Failed to find file {file_id} of transfer {transfer_id} for cancellation")));
    }

    pub fn cancel_transfer(&mut self, transfer_id: &str) -> Result<(), AppError> {
        if let Some(file_locks) = self.locks.get(transfer_id) {
            for (_, lock) in file_locks {
                let mut cancelled = lock.write().unwrap();
                *cancelled = true;
            }
            
            return Ok(());
        }

        Err(AppError::Internal(format!("Failed to find {transfer_id} for cancellation")))
    }

    pub fn get_cancellation_tracker(&self, transfer_id: &str, file_id: &str) -> Result<FileCancellationTracker, AppError> {
        let lock = self.get_file_cancellation_lock(transfer_id, file_id)?;

        Ok(
            FileCancellationTracker {
                lock: lock.clone()
            }
        )
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

pub struct FileCancellationTracker {
    lock: Arc<RwLock<bool>>,
}

impl FileCancellationTracker {
    fn is_cancelled(&self) -> bool {
        let cancelled = self.lock.read().unwrap();
        *cancelled
    }
}