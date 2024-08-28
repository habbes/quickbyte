-- Your SQL goes here
CREATE TABLE file_chunks(
    -- chunk id within the file, not guaranteed to be globally unique
    id VARCHAR(50) NOT NULL,
    file_id VARCHAR(50) NOT NULL,
    -- index of the chunk within the file
    index INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    PRIMARY KEY (id, file_id),
    FOREIGN KEY (file_id) REFERENCES files(id)
)