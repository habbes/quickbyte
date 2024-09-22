use tokio::sync::mpsc::error::SendError;

#[derive(Debug)]
pub enum AppError {
    Internal(String),
}

impl<T> From<SendError<T>> for AppError {
    fn from(value: SendError<T>) -> Self {
        AppError::Internal(String::from("Failed to send message over channel."))
    }
}