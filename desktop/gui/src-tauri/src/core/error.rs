use tokio::sync::mpsc::error::SendError;
// see: https://docs.rs/thiserror/latest/thiserror/
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("internal error occurred: {0}")]
    Internal(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    General(String),
}

impl<T> From<SendError<T>> for AppError {
    fn from(value: SendError<T>) -> Self {
        AppError::Internal(String::from("failed to send message over channel"))
    }
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
