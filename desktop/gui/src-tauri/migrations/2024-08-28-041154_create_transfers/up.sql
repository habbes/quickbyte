-- Your SQL goes here
CREATE TABLE transfers(
    id VARCHAR(50) PRIMARY KEY NOT NULL,
    name VARCHAR(255) NOT NULL,
    total_size INTEGER NOT NULL,
    status VARCHAR(255) NOT NULL,
    error VARCHAR(255),
    -- "download" or "upload"
    transfer_kind VARCHAR(255) NOT NULL,
    -- If a download, is it "legacy_transfer" or "project_share"
    download_type VARCHAR(255),
    -- Applies to "project_share"
    share_id VARCHAR(255),
    -- Applies to project_share
    share_code VARCHAR(255),
    -- Applies to project_share
    share_password VARCHAR(255),
    -- Applies legacy_transfer
    download_transfer_id VARCHAR(255),
    local_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)