use tauri::AppHandle;
use tauri::Manager;
use crate::core::event::Event;

pub fn bridge_events(app: &AppHandle, event: Event) {
  match event {
    Event::Transfers => app.emit_all("transfers", "test"),
  };
}