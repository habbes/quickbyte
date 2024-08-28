// @generated automatically by Diesel CLI.

diesel::table! {
    file_chunks (id, file_id) {
        id -> Text,
        file_id -> Text,
        chunk_index -> Integer,
        status -> Text,
    }
}

diesel::table! {
    files (id) {
        id -> Text,
        name -> Text,
        size -> Integer,
        status -> Text,
        error -> Nullable<Text>,
        provider -> Text,
        transfer_url -> Text,
        local_path -> Text,
        chunk_size -> Integer,
        created_at -> Timestamp,
        transfer_id -> Text,
    }
}

diesel::table! {
    transfers (id) {
        id -> Text,
        name -> Text,
        total_size -> Integer,
        status -> Text,
        error -> Nullable<Text>,
        transfer_kind -> Text,
        download_type -> Nullable<Text>,
        share_id -> Nullable<Text>,
        share_code -> Nullable<Text>,
        share_password -> Nullable<Text>,
        download_transfer_id -> Nullable<Text>,
        local_path -> Text,
        created_at -> Timestamp,
    }
}

diesel::joinable!(file_chunks -> files (file_id));
diesel::joinable!(files -> transfers (transfer_id));

diesel::allow_tables_to_appear_in_same_query!(
    file_chunks,
    files,
    transfers,
);
