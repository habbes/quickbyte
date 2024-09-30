use tauri::api::notification::Notification;
use tauri::AppHandle;
use tauri::Manager;
use crate::core::dtos::TransferKind;
use crate::core::event::Event;

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
    }
    _ => (),
  };
}