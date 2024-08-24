use super::dtos::TransferJob;


#[derive(Debug)]
pub enum Event {
  TransferCreated(TransferJob),
}