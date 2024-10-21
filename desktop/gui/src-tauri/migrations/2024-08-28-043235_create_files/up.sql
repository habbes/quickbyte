-- Your SQL goes here
CREATE TABLE files(
    id VARCHAR(50) PRIMARY KEY NOT NULL,
    remote_file_id VARCHAR(50) NOT NULL,
    transfer_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    status VARCHAR(255) NOT NULL,
    error VARCHAR(255),
    -- Currently, only "az" is supported
    provider VARCHAR(255) NOT NULL,
    -- remote upload or download url
    transfer_url VARCHAR(255) NOT NULL,
    local_path VARCHAR(255) NOT NULL,
    block_size BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_id) REFERENCES transfers(id)
    ON DELETE CASCADE
)