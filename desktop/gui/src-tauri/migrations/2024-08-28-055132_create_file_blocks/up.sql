-- Your SQL goes here
CREATE TABLE file_blocks(
    -- chunk id within the file, not guaranteed to be globally unique
    id VARCHAR(50) NOT NULL,
    file_id VARCHAR(50) NOT NULL,
    -- index of the block within the file
    -- the size of the block is determined by its index and the file's chunk size
    block_index BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    PRIMARY KEY (id, file_id),
    FOREIGN KEY (file_id) REFERENCES files(id)
    ON DELETE CASCADE
)