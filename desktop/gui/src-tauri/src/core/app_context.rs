use crate::core::request::Request;
use crate::request_manager::RequestManager;

#[derive(Debug)]
pub struct AppContext {
    pub requests: RequestManager<Request>,
}

impl AppContext {
  pub fn new() -> Self {
    Self {
      requests: RequestManager::new(),
    }
  }
}
