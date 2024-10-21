pub fn get_num_chunks(file_size: u64, chunk_size: u64) -> u64{
    assert!(file_size > 0);
    assert!(chunk_size > 0);

    // Calculate the number of chunks, rounding up
    (file_size + chunk_size - 1) / chunk_size
}

pub fn get_block_size_at_index(block_index: u64, file_size: u64, block_size: u64) -> u64 {
    let last_index = get_num_chunks(file_size, block_size) - 1;
    if block_index < last_index {
        block_size
    } else {
        file_size - last_index * block_size
    }
}