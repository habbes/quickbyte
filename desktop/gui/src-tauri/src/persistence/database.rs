use diesel::SqliteConnection;
use diesel::prelude::*;
use diesel::BelongingToDsl; 
use crate::core::dtos::TransferJobFile;
use crate::{core::dtos::TransferJob, schema::*};
use super::{db, models::*};


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

        println!("Created transfer in db {job:?}");
    }

    pub fn load_transfers(&mut self) -> Vec<TransferJob>{
        // Following code suffers from N+1 query problem.
        // Using belonging_to didn't work, so this was a quick workaround
        let all_transfers = transfers::table
        .select(Transfer::as_select())
        .load(&mut self.connection)
        .expect("Failed to load transfers from database");

        let mut result: Vec<TransferJob> = Vec::new();
        for transfer in all_transfers {
            let files = files::table
            .filter(files::dsl::transfer_id.eq(&transfer.id))
            .select(File::as_select())
            .load(&mut self.connection)
            .expect("Failed to load file from database");
            
            let job = map_transfer_from_db(transfer, &files);
            result.push(job);
        }

        println!("Loaded jobs from db {result:?}");

        result
    }

    // pub fn load_transfers(&mut self) {
    //     let all_transfers = transfers::table
    //     .select(Transfer::as_select())
    //     .load(&mut self.connection)
    //     .expect("Failed to load transfers from database");

        
    //     let files = File::belonging_to(&all_transfers)
    //     .select(File::as_select())
    //     .load(&mut self.connection);

    //     // group the files per transfer
    //     let files_per_transfer = files
    //     .grouped_by(&all_transfers)
    //     .into_iter()
    //     .zip(all_transfers)
    //     .map(|(files, transfer)| (files, transfer))
    //     .collect::<Vec<(Transfer, Vec<File>)>>();
    // }

    // fn get_all_transfers(&mut self)  -> Vec<(Transfer, Vec<File>)>  {
    //     // Load all transfers
    //     let all_transfers: Vec<Transfer> = transfers::table
    //     .select(Transfer::as_select())
    //     .load::<Transfer>(&mut self.connection)
    //     .expect("Failed to load transfers from database");

    //     // Load files along with their associated transfers
    //     let file_rows: Vec<(File, Transfer)> = files::table
    //         .inner_join(transfers::table.on(files::transfer_id.eq(transfers::id)))
    //         .select((files::all_columns, transfers::all_columns))
    //         .load::<(File, Transfer)>(&mut self.connection)
    //         .expect("Failed to load files from database");

    //     // Create a mapping of transfer IDs to their associated files
    //     let mut transfer_files_map: std::collections::HashMap<String, Vec<File>> = std::collections::HashMap::new();
    //     for (file, transfer) in file_rows {
    //         transfer_files_map
    //             .entry(transfer.id)
    //             .or_insert_with(Vec::new)
    //             .push(file);
    //     }

    //     // Combine transfers with their associated files
    //     let files_per_transfer: Vec<(Transfer, Vec<File>)> = all_transfers
    //         .into_iter()
    //         .map(|transfer| {
    //             let files = transfer_files_map
    //                 .remove(&transfer.id)
    //                 .unwrap_or_else(Vec::new);
    //             (transfer, files)
    //         })
    //         .collect();

    //     files_per_transfer

    // }
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

fn map_transfer_from_db(transfer: Transfer, files: &[File]) -> TransferJob {
    let files: Vec<TransferJobFile> = files.iter().map(|f| TransferJobFile {
        _id: f.id.clone(),
        name: f.name.clone(),
        size: f.size as u64,
        status: f.status.as_str().into(),
        remote_url: f.transfer_url.clone(),
        local_path: f.local_path.clone(),
        error: f.error.clone(),
        chunk_size: f.block_size as u64,
        completed_size: 0,
    }).collect();

    let transfer_job = TransferJob {
        _id: transfer.id.clone(),
        name: transfer.name.clone(),
        total_size: transfer.total_size as u64,
        num_files: files.len(),
        status: transfer.status.into(),
        completed_size: 0,
        error: transfer.error,
        transfer_kind: transfer.transfer_kind.into(),
        download_type: transfer.download_type.map(|v| v.into()),
        local_path: transfer.local_path,
        share_id: transfer.share_id,
        share_code: transfer.share_code,
        share_password: transfer.share_password,
        download_transfer_id: transfer.download_transfer_id,
        files
    };

    transfer_job
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
