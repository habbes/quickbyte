use diesel::SqliteConnection;
use diesel::prelude::*;
use crate::core::dtos::TransferJobFile;
use crate::schema::files;
use crate::{core::dtos::TransferJob, schema::transfers};

use super::models::File;
use super::models::NewFile;
use super::{db, models::{NewTransfer, Transfer}};


pub struct Database {
    connection: SqliteConnection,
}

impl Database {
    pub fn init(db_path: &str) -> Self {
        let connection = db::init(db_path);

        Self {
            connection
        }
    }

    pub fn create_transfer(&mut self, job: &TransferJob) {
        let transfer: NewTransfer = job.into();
        diesel::insert_into(transfers::table)
        .values(&transfer)
        .execute(&mut self.connection)
        .expect("Error inserting transfer into database");

        let new_files = job.files.iter().map(|f| map_transfer_to_new_file(f, &job._id));
        for file in new_files {
            diesel::insert_into(files::table)
            .values(&file)
            .execute(&mut self.connection)
            .expect("Error inserting transfer file into database");
        }
    }
}

impl<'a> From<&'a TransferJob> for NewTransfer<'a> {
    fn from(job: &'a TransferJob) -> Self {
        NewTransfer {
            id: job._id.as_str(),
            name: job.name.as_str(),
            total_size: job.total_size as i64,
            status: (&job.status).into(),
            error: job.error.as_ref().map(|v| v.as_str()),
            transfer_kind: (&job.transfer_kind).into(),
            download_type: job.download_type.as_ref().map(|v| v.into()),
            share_id: job.share_id.as_ref().map(|v| v.as_str()),
            share_code: job.share_code.as_ref().map(|v| v.as_str()),
            share_password: job.share_password.as_ref().map(|v| v.as_str()),
            download_transfer_id: job.download_transfer_id.as_ref().map(|v| v.as_str()),
            local_path: job.local_path.as_str(),
        }
    }
}

fn map_transfer_to_new_file<'a>(job: &'a TransferJobFile, transfer_id: &'a str) -> NewFile<'a> {
    NewFile {
        id: job._id.as_str(),
        name: job.name.as_str(),
        transfer_id: transfer_id,
        size: job.size as i64,
        status: (&job.status).into(),
        error: job.error.as_ref().map(|v| v.as_str()),
        transfer_url: &job.remote_url,
        block_size: job.chunk_size as i64,
        provider: "az", // TODO: get from API
        local_path: &job.local_path
    }
}

// fn map_transfer_job(job: &TransferJob) -> Transfer {
//     Transfer {
//         id: job._id,
//         name: job.name.clone(),
//         total_size: job.total_size,
//         status: job.status,
//         error: job.error,
//         transfer_kind: job.transfer_kind,
//         download_type: job.download_type,
//         share_id: job.share_id,
//         share_code: job.share_code,
//         share_password: job.share_password,
//         download_transfer_id: job.download_transfer_id,
//     }
// }
