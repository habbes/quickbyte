use tauri::AppHandle;
use tauri::Manager;
use crate::core::event::Event;

pub fn bridge_events(app: &AppHandle, event: Event) {
  println!("Bridging event {event:?}");
  match event {
    Event::TransferCreated(transfer) => app.emit_all("transfer_created", transfer).unwrap(),
    Event::Transfers(transfers) => app.emit_all("transfers", transfers).unwrap()
  };
}