

const KEYRING_SERVICE: &str = "QuickbyteTransferToken";
const KEYRING_USER: &str = "QuickbyteTransferUser";

pub struct AuthTokenResult {
    pub token: String,
}

pub fn try_get_user_token() -> Option<AuthTokenResult> {
    let entry = get_keyring_entry();
    if let Ok(password) = entry.get_password() {
        return Some(AuthTokenResult { token: password });
    }

    None
}

pub fn set_user_token(token: &str) {
    let entry = get_keyring_entry();
    entry.set_password(token).expect("Failed to set password");
}

fn get_keyring_entry() -> keyring::Entry {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).expect("Failed to create keyring entry")
}