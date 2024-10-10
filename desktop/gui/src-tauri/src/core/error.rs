use tokio::sync::mpsc::error::{SendError, RecvError};
// see: https://docs.rs/thiserror/latest/thiserror/
use thiserror::Error;
use azure_core::{error::ErrorKind as AzureErrorKind, StatusCode, Result as AzureResult};

#[derive(Error, Debug)]
pub enum AppError {
    #[error("internal error occurred: {0}")]
    Internal(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    General(String),
    #[error("transfer error: {0}")]
    Transfer(String),
    #[error("transfer link expired or removed: {0}")]
    FileTransferLinkAuth(String),
    #[error("network error: {0}")]
    Network(String),
}

impl<T> From<SendError<T>> for AppError {
    fn from(value: SendError<T>) -> Self {
        AppError::Internal(String::from("failed to send message over channel"))
    }
}

impl From<azure_core::error::Error> for AppError {
    fn from(value: azure_core::error::Error) -> Self {
        match value.kind() {
            AzureErrorKind::HttpResponse { status, error_code } => match status {
                StatusCode::Forbidden => AppError::FileTransferLinkAuth(format!("{error_code:?}")),
                StatusCode::NotFound => AppError::FileTransferLinkAuth(format!("{error_code:?}")),
                _ => AppError::Transfer(format!("{error_code:?}"))
            },
            AzureErrorKind::Credential => AppError::FileTransferLinkAuth(value.to_string()),
            AzureErrorKind::Io => AppError::Network(value.to_string()),
            _ => AppError::Transfer(value.to_string())
        }
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
