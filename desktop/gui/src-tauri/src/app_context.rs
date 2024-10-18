use std::sync::Arc;
use tokio;

use crate::core::request::Request;
use crate::core::{event::Event, transfer_manager::TransferManager};
use crate::core::message_channel::{MessageChannel, SyncMessageChannel};
use crate::persistence::database::Database;

pub struct AppContext {
  pub requests: MessageChannel<Request>
}

impl AppContext {
  pub async fn init(db_path: String, event_handler: impl Fn(Event) + Send + 'static) -> Self {
    println!("Init app with db_path {db_path}");
    let saved_jobs;
    let database = {
      let mut database = Database::init(&db_path);
      saved_jobs = database.load_transfers();
      // let database = Arc::new(std::sync::Mutex::new(database));
      Arc::new(std::sync::Mutex::new(database))
    };
    let db_sync_channel = Arc::new(SyncMessageChannel::new( move|message| {
      match message {
        Event::TransferCreated(transfer) => database.lock().unwrap().create_transfer(&transfer),
        Event::TransferStatusUpdate {
          transfer_id,
          status,
          error
        } => database.lock().unwrap().update_transfer_status(&transfer_id, &status, error.as_deref()),
        Event::TransferFileStatusUpdate {
          file_id,
          transfer_id,
          status,
          error
        } => database.lock().unwrap().update_file_status(&file_id,  &status, error.as_deref()),
        Event::TransferFileBlockStatusUpdate {
          block_id,
          file_id,
          status,
          error } => database.lock().unwrap().update_block_status(&block_id, &file_id, &status),
        Event::TransferDeleted {
          transfer_id
        } => database.lock().unwrap().delete_transfer(&transfer_id),
        _ => (),
      };
    }));

    let events = MessageChannel::new(event_handler);
    let transfers = Arc::new(TransferManager::new( events.clone(), db_sync_channel.clone()));

    let requests = MessageChannel::new(move|request| {
      let transfers = transfers.clone();
      tokio::spawn(async move {
        transfers.execute_request(request).await;
      });
    });
    
    for job in saved_jobs {
      requests.send(Request::ResumeTransfer(job)).await;
    }
    
    Self {
      requests
    }
  }
}
