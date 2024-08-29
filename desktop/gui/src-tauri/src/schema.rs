// @generated automatically by Diesel CLI.

diesel::table! {
    file_blocks (id, file_id) {
        id -> Text,
        file_id -> Text,
        block_index -> BigInt,
        status -> Text,
    }
}

diesel::table! {
    files (id) {
        id -> Text,
        remote_file_id -> Text,
        transfer_id -> Text,
        name -> Text,
        size -> BigInt,
        status -> Text,
        error -> Nullable<Text>,
        provider -> Text,
        transfer_url -> Text,
        local_path -> Text,
        block_size -> BigInt,
        created_at -> Timestamp,
    }
}

diesel::table! {
    transfers (id) {
        id -> Text,
        name -> Text,
        total_size -> BigInt,
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

diesel::joinable!(file_blocks -> files (file_id));
diesel::joinable!(files -> transfers (transfer_id));

diesel::allow_tables_to_appear_in_same_query!(
    file_blocks,
    files,
    transfers,
);
