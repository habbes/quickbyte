use serde::{Serialize, Deserialize};

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