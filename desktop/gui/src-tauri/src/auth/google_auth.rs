use axum::{extract::Query, response::IntoResponse, routing::get, Extension, Router};
use serde::Deserialize;
use tokio::net::{TcpListener};
use url::Url;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
// Get request from frontend via command

// Generate request credentials
// Open listening server, get redirect url
// genere request url
// open default browser with url
// when auth result arrives on embedded server, send request

use oauth2::{basic::BasicClient, AuthUrl, AuthorizationCode, ClientId, CsrfToken, PkceCodeChallenge, RedirectUrl};

const CLIENT_ID: &str = "";
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";


pub async fn sign_in_with_google() {
    let (code_challenge, code_verifier) = PkceCodeChallenge::new_random_sha256();
    let socket_addr = get_available_addr().await;
    // let socket_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9133); // TODO: pick a random port
    let redirect_url = format!("http://{socket_addr}/callback");
    let redirect_url = Url::parse(&redirect_url).unwrap();
    let redirect_url = RedirectUrl::from_url(redirect_url);

    let client_id = ClientId::new(String::from(CLIENT_ID));
    // Google auth endpoint
    let auth_url = AuthUrl::from_url(Url::parse(AUTH_URL).unwrap());

    let csrf_token = CsrfToken::new_random();
    let client = BasicClient::new(client_id, None, auth_url, None)
        .set_redirect_uri(redirect_url);

    let (request_url, _) = client
        .authorize_url(|| csrf_token)
        .set_pkce_challenge(code_challenge)
        .url();

    open::that(request_url.to_string()).unwrap();

    let listener = TcpListener::bind(socket_addr).await.unwrap();
    let app = Router::new()
        .route("/callback", get(authorize_handler));
    axum::serve(listener, app).await.unwrap();
}

async fn get_available_addr() -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    drop(listener);

    addr
}

#[derive(Deserialize)]
struct CallbackQuery {
    code: AuthorizationCode,
    state: CsrfToken,
}

async fn run_server(handle: tauri::AppHandle, socket_addr: &str) {
    let listener = TcpListener::bind(socket_addr).await.unwrap();
    let app = Router::new()
        .route("/callback", get(authorize_handler));
    axum::serve(listener, app).await.unwrap();
}


async fn authorize_handler(handle: Extension<tauri::AppHandle>, query: Query<CallbackQuery>) -> impl IntoResponse {

    "Login successful. You can close this browser tab and return to the Quickbyte app."
}