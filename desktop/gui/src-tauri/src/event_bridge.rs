use tauri::api::notification::Notification;
use tauri::AppHandle;
use tauri::Manager;
use serde::{Serialize, Deserialize};
use crate::core::dtos::TransferKind;
use crate::core::event::Event;
use crate::core::models::JobStatus;

pub fn bridge_events(app: &AppHandle, event: Event) {
  match event {
    Event::TransferCreated(transfer) => app.emit_all("transfer_created", transfer).unwrap(),
    Event::Transfers(transfers) => app.emit_all("transfers", transfers).unwrap(),
    Event::TransferCompleted(transfer) => {
      let message = match transfer.transfer_kind {
        TransferKind::Download => format!("Finished downloading files '{}' from Quickbyte.", transfer.name),
        TransferKind::Upload => format!("Finished uploading files '{}' to Quickbyte", transfer.name)
      };

      Notification::new(&app.config().tauri.bundle.identifier)
      .title("Quickbyte transfer complete")
      .body(message)
      .show().expect("Failed to send transfer complete notitifcation");

      app.emit_all("transfer_completed", transfer).unwrap();
    },
    Event::TransferFileUploadComplete {
      file_id,
      transfer_id,
      remote_file_id,
      remote_transfer_id
     } => {
      app.emit_all("transfer_file_upload_completed", TransferFileCompletedEvent {
        transfer_id: remote_transfer_id,
        file_id: remote_file_id
      }).unwrap();
    }
    _ => (),
  };
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct TransferFileCompletedEvent {
  transfer_id: String,
  file_id: String
}