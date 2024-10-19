

const KEYRING_SERVICE: &str = "Quickbyte Transfer Authentication";
const KEYRING_USER: &str = "Quickbyte Transfer Signed User";


pub struct AuthStore {
    keyring_service: String,
    keyring_user: String,
}

impl AuthStore {
    pub fn init(app_name: &str) -> Self {

        AuthStore {
            keyring_service: String::from(app_name),
            keyring_user: format!("{app_name} User")
        }
    }

    pub fn try_get_user_token(&self) -> Option<AuthTokenResult> {
        let entry = self.get_keyring_entry();
        if let Ok(password) = entry.get_password() {
            return Some(AuthTokenResult { token: password });
        }
    
        None
    }

    pub fn set_user_token(&self, token: &str) {
        let entry = self.get_keyring_entry();
        entry.set_password(token).expect("Failed to set password");
    }

    pub fn delete_user_token(&self) {
        let entry = &self.get_keyring_entry();
        entry.delete_credential().expect("Failed to delete token");
    }

    fn get_keyring_entry(&self) -> keyring::Entry {
        keyring::Entry::new(&self.keyring_service, &self.keyring_user).expect("Failed to create keyring entry")
    }
}

pub struct AuthTokenResult {
    pub token: String,
}
