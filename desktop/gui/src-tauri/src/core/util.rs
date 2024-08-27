pub fn get_num_chunks(file_size: u64, chunk_size: u64) -> u64{
    assert!(file_size > 0);
    assert!(chunk_size > 0);

    // Calculate the number of chunks, rounding up
    (file_size + chunk_size - 1) / chunk_size
}