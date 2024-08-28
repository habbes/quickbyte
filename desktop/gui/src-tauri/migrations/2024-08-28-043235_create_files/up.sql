-- Your SQL goes here
CREATE TABLE files(
    id VARCHAR(50) PRIMARY KEY NOT NULL,
    name VARCHAR(255) NOT NULL,
    size INTEGER NOT NULL,
    status VARCHAR(255) NOT NULL,
    error VARCHAR(255),
    -- Currently, only "az" is supported
    provider VARCHAR(255) NOT NULL,
    -- remote upload or download url
    transfer_url VARCHAR(255) NOT NULL,
    local_path VARCHAR(255) NOT NULL,
    chunk_size INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    transfer_id VARCHAR(50) NOT NULL,
    FOREIGN KEY (transfer_id) REFERENCES transfers(id)
)