use diesel::prelude::*;
use crate::{core::{dtos::{DownloadType, TransferKind}, models::JobStatus}, schema::{file_blocks, files, transfers}};
use chrono::NaiveDateTime;

#[derive(Queryable, Identifiable, Selectable, Debug, PartialEq)]
#[diesel(table_name = transfers)]
pub struct Transfer {
    pub id: String,
    pub name: String,
    pub total_size: u64,
    pub status: JobStatus,
    pub error: Option<String>,
    pub transfer_kind: TransferKind,
    pub download_type: Option<DownloadType>,
    pub share_id: Option<String>,
    pub share_code: Option<String>,
    pub share_password: Option<String>,
    pub download_transfer_id: Option<String>,
    pub local_path: String,
    pub created_at: NaiveDateTime
}

#[derive(Insertable)]
#[diesel(table_name = transfers)]
pub struct NewTransfer<'a> {
    pub id: &'a str,
    pub name: &'a str,
    pub total_size: i64,
    pub status: &'a str,
    pub error: Option<&'a str>,
    pub transfer_kind: &'a str,
    pub download_type: Option<&'a str>,
    pub share_id: Option<&'a str>,
    pub share_code: Option<&'a str>,
    pub share_password: Option<&'a str>,
    pub download_transfer_id: Option<&'a str>,
    pub local_path: &'a str,
}

#[derive(Queryable, Identifiable, Selectable, Debug, PartialEq)]
#[diesel(belongs_to(Transfer))]
#[diesel(table_name = files)]
pub struct File {
    pub id: String,
    pub transfer_id: String,
    pub name: String,
    pub size: u64,
    pub status: JobStatus,
    pub error: Option<String>,
    pub provider: String,
    pub transfer_url: String,
    pub local_path: String,
    pub block_size: u64,
    pub created_at: NaiveDateTime
}

#[derive(Insertable)]
#[diesel(belongs_to(Transfer))]
#[diesel(table_name = files)]
pub struct NewFile<'a> {
    pub id: &'a str,
    pub transfer_id: &'a str,
    pub name: &'a str,
    pub size: i64,
    pub status: &'a str,
    pub error: Option<&'a str>,
    pub provider: &'a str,
    pub transfer_url: &'a str,
    pub local_path: &'a str,
    pub block_size: i64,
}

#[derive(Queryable, Identifiable, Selectable, Debug, PartialEq)]
#[diesel(belongs_to(File))]
#[diesel(table_name = file_blocks)]
pub struct FileBlock {
    pub id: String,
    pub file_id: String,
    pub block_index: u64,
    pub status: JobStatus,
}