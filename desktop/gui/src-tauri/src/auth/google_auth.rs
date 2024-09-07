use axum::{extract::Query, response::IntoResponse, routing::get, Extension, Router};
use serde::Deserialize;
use tokio::net::{TcpListener};
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

const CLIENT_ID: &str = "";
const CLIENT_SECRET: &str = "";
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";


pub async fn sign_in_with_google(handle: tauri::AppHandle) {
    println!("Init sign in with google");
    let (code_challenge, code_verifier) = PkceCodeChallenge::new_random_sha256();
    let socket_addr = get_available_addr().await;
    // let socket_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 9133); // TODO: pick a random port
    let redirect_url = format!("http://{socket_addr}/callback");
    let redirect_url = Url::parse(&redirect_url).unwrap();
    let redirect_url = RedirectUrl::from_url(redirect_url);

    let client_id = ClientId::new(String::from(CLIENT_ID));
    let client_secret = ClientSecret::new(String::from(CLIENT_SECRET));
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
        .url();

    println!("Open browser with url {request_url}");
    open::that(request_url.to_string()).unwrap();

    let auth_state = AuthState {
        csrf_token: csrf_token,
        pkce: Arc::new((code_challenge, PkceCodeVerifier::secret(&code_verifier).to_string())),
        client: Arc::new(client),
        socket_addr
    };

    let server_handle = tauri::async_runtime::spawn(async move { run_server(handle, auth_state).await });

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
    socket_addr: SocketAddr
}

#[derive(serde::Deserialize)]
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

#[derive(serde::Deserialize)]
struct GoogleAuthTokenErrorResponse {
    error: String,
    error_description: String,
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
    let success_message = "Login successful. You can close this browser tab and return to the Quickbyte app.";
    if query.state.secret() != auth.csrf_token.secret() {
        println!("Suspected Man in the Middle attack!");
        return String::from(success_message); // never let them know your next move
    }

    println!("Authorization code {}", query.code.secret());
    println!("Code verified {}", auth.pkce.1);

    // attempting to make a http request directly because
    // the oauth2 library does not expose the id token,
    // but currently getting an invalid_request error.
    // I suspect the code verifier
    let client = Client::new();
    let redirect_url = format!("{}/callback", auth.socket_addr);
    // let code_verifier = PkceCodeVerifier::new(auth.pkce.1.clone());
    let code_verifier = auth.pkce.1.clone();
    let token_request_data = [
        ("client_id", CLIENT_ID),
        ("client_secret", CLIENT_SECRET),
        ("code", query.code.secret()),
        ("grant_type", "authorization_code"),
        ("redirect_uri", &redirect_url),
        ("code_verifier", &code_verifier)
    ];
    let token_response = client.post(TOKEN_URL)
    .form(&token_request_data)
    .send()
    .await.unwrap();

    if !token_response.status().is_success() {
        let error_response: GoogleAuthTokenErrorResponse = token_response.json().await.unwrap();
        return format!("Error: {}, {}", error_response.error, error_response.error_description);
        // println!("Status {}", token_response.status());
        // println!("Response {}", token_response.text().await.unwrap());
        // return "Authentication failed.";
    }

    let token: GoogleAuthTokenResponse = token_response.json().await.unwrap();

    // let token = auth
    //     .client
    //     .exchange_code(query.code.clone())
    //     .set_pkce_verifier(PkceCodeVerifier::new(auth.pkce.1.clone()))
    //     .request_async(async_http_client)
    //     .await
    //     .unwrap();

    println!("Request received, access token: {}, id token: {}", token.access_token, token.id_token.unwrap());
    String::from("Login successful. You can close this browser tab and return to the Quickbyte app.")
}