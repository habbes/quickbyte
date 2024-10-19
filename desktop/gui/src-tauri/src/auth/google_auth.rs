use axum::{extract::Query, response::IntoResponse, routing::get, Extension, Router};
use serde::{Deserialize, Serialize};
use tokio::net::{TcpListener};
use tokio::sync;
use url::Url;
use std::{net::{IpAddr, Ipv4Addr, SocketAddr}, sync::Arc};
use reqwest::{Client,ClientBuilder, StatusCode};
// Get request from frontend via command

// Generate request credentials
// Open listening server, get redirect url
// genere request url
// open default browser with url
// when auth result arrives on embedded server, send request

use oauth2::{basic::BasicClient, reqwest::async_http_client, AuthUrl, AuthorizationCode, ClientId, ClientSecret, CsrfToken, PkceCodeChallenge, PkceCodeVerifier, RedirectUrl, Scope, TokenResponse, TokenUrl};

use crate::core::error::AppError;

// See: https://developers.google.com/identity/protocols/oauth2 and https://developers.google.com/identity/protocols/oauth2/native-app
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";

fn get_client_id() -> String {
    std::env::var("GOOGLE_CLIENT_ID").expect("Failed to load GOOGLE_CLIENT_ID")
}

fn get_client_secret() -> String  {
    std::env::var("GOOGLE_CLIENT_SECRET").expect("Failed to load GOOGLE_CLIENT_SECRET")
}


pub async fn sign_in_with_google(handle: tauri::AppHandle) -> Result<SignInWithGoogleResult, AppError> {
    println!("Init sign in with google");
    let (code_challenge, code_verifier) = PkceCodeChallenge::new_random_sha256();
    println!("PCKE code verifier {:?} code challenge {code_challenge:?}", code_verifier.secret().to_string());

    let socket_addr = get_available_addr().await;
    // let socket_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9133); // TODO: pick a random port
    let redirect_url = format!("http://{socket_addr}/callback");
    let redirect_url = Url::parse(&redirect_url).unwrap();
    let redirect_url = RedirectUrl::from_url(redirect_url);

    let client_id = ClientId::new(get_client_id());
    let client_secret = ClientSecret::new(get_client_secret());
    // Google auth endpoint
    let auth_url = AuthUrl::from_url(Url::parse(AUTH_URL).unwrap());
    let token_url = TokenUrl::from_url(Url::parse(TOKEN_URL).unwrap());

    let csrf_token = CsrfToken::new_random();
    let client = BasicClient::new(client_id, Some(client_secret), auth_url, Some(token_url))
        .set_redirect_uri(redirect_url);

    let (request_url, _) = client
        .authorize_url(|| csrf_token.clone())
        .set_pkce_challenge(code_challenge.clone())
        .add_scope(Scope::new("openid".to_string()))
        .add_scope(Scope::new("email".to_string()))
        .add_scope(Scope::new("profile".to_string()))
        .url();

    println!("Open browser with url {request_url}");
    open::that(request_url.to_string()).unwrap();

    let (result_tx, mut result_rx ) = sync::mpsc::channel(1);

    let auth_state = AuthState {
        csrf_token: csrf_token,
        pkce: Arc::new((code_challenge, PkceCodeVerifier::secret(&code_verifier).to_string())),
        client: Arc::new(client),
        socket_addr,
        result_sender: Arc::new(result_tx)
    };

    let server_handle = tauri::async_runtime::spawn(async move { run_server(handle, auth_state).await });

    let res = result_rx
        .recv()
        .await
        .ok_or_else(|| AppError::Internal(String::from("Failed to get Google auth result")))?;

    println!("Received token result {res:?}");

    match res {
        GoogleAuthResult::Success { id_token } => Ok(SignInWithGoogleResult { id_token }),
        GoogleAuthResult::Error { error  } => Err(AppError::AuthError(error))
    }
    // let listener = TcpListener::bind(socket_addr).await.unwrap();
    // let app = Router::new()
    //     .route("/callback", get(authorize_handler));
    // axum::serve(listener, app).await.unwrap();
}

async fn get_available_addr() -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    drop(listener);

    addr
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SignInWithGoogleResult {
    id_token: String
}

#[derive(Deserialize)]
struct CallbackQuery {
    code: AuthorizationCode,
    state: CsrfToken,
}

#[derive(Clone)]
struct AuthState {
    csrf_token: CsrfToken,
    pkce: Arc<(PkceCodeChallenge, String)>,
    client: Arc<BasicClient>,
    socket_addr: SocketAddr,
    result_sender: Arc<sync::mpsc::Sender<GoogleAuthResult>>
}

#[derive(serde::Deserialize, Debug)]
struct GoogleAuthTokenResponse {
    access_token: String,
    expires_in: u64,
    token_type: String,
    scope: String,
    refresh_token: String,
    id_token: Option<String>,
    error: Option<String>,
    error_description: Option<String>
}

#[derive(serde::Deserialize, Debug)]
struct GoogleRefreshAuthResponse {
    access_token: String,
    expires_in: u64,
    token_type: String,
    id_token: Option<String>
}

#[derive(serde::Deserialize)]
struct GoogleAuthTokenErrorResponse {
    error: String,
    error_description: String,
}

#[derive(Debug)]
enum GoogleAuthResult {
    Success { id_token: String },
    Error { error: String }
}

async fn run_server(handle: tauri::AppHandle, auth: AuthState) {
    let listener = TcpListener::bind(auth.socket_addr).await.unwrap();
    let app = Router::new()
        .route("/callback", get(authorize_handler))
        .layer(Extension(handle.clone()))
        .layer(Extension(auth.clone()));
    axum::serve(listener, app).await.unwrap();
}


async fn authorize_handler(auth: Extension<AuthState>, query: Query<CallbackQuery>) -> impl IntoResponse {
    let result_tx = auth.result_sender.clone();
    let success_message = "Login successful. You can close this browser tab and return to the Quickbyte app.";
    if query.state.secret() != auth.csrf_token.secret() {
        println!("Suspected Man in the Middle attack!");
        return String::from(success_message); // never let them know your next move
    }

    let client = Client::new();

    let token = auth
        .client
        .exchange_code(query.code.clone())
        .set_pkce_verifier(PkceCodeVerifier::new(auth.pkce.1.clone()))
        .request_async(async_http_client)
        .await
        .unwrap();

    println!("Auth success, access token: {:?}, refresh token: {:#?}", token.access_token().secret().to_string(), token.refresh_token().unwrap().secret().to_string());

    let client_id = get_client_id();
    let client_secret = get_client_secret();

    // the oauth2 lib doesn't include the id_token, make a separate request to get the id_token
    let id_token_request_data = [
        ("client_id", client_id.as_str()),
        ("client_secret", client_secret.as_str()),
        ("refresh_token", token.refresh_token().unwrap().secret()),
        ("grant_type", "refresh_token")
    ];

    let token_response = client.post(TOKEN_URL)
    .form(&id_token_request_data)
    .send()
    .await.unwrap();


    if !token_response.status().is_success() {
        let error_response: GoogleAuthTokenErrorResponse = token_response.json().await.unwrap();
        let error_message = format!("Error: {}, {}", error_response.error, error_response.error_description);
        result_tx.send(GoogleAuthResult::Error { error: error_message.clone() }).await.expect("Failed to send result message");

        return error_message;
        // println!("Status {}", token_response.status());
        // println!("Response {}", token_response.text().await.unwrap());
        // return "Authentication failed.";
    }

    println!("SUCCESSFUL refresh_token request");

    let token: GoogleRefreshAuthResponse = token_response.json().await.unwrap();
    println!("TOken resp {token:#?}");

    let id_token = token.id_token.unwrap();
    println!("ID TOKEN {id_token}");
    result_tx.send(GoogleAuthResult::Success { id_token: id_token }).await.expect("Failed to send result message");
    println!("Sent result");

    
    String::from("Login successful. You can close this browser tab and return to the Quickbyte app.")
}