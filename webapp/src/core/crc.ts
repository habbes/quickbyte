const crc32Table = function() {
    const tbl = [];
    let c;
    for(let n = 0; n < 256; n++){
        c = n;
        for(let k = 0; k < 8; k++){
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }

        tbl[n] = c;
    }

    return tbl;
}();

export function crc32(data: ArrayLike<number>) {
    let crc = -1;
    for(let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ crc32Table[(crc ^ data[i]) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
}

function crc32PartialUpdate(prevCrc: number, data: ArrayLike<number>) {
    let crc = prevCrc;
    for(let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ crc32Table[(crc ^ data[i]) & 0xFF];
    }

    return crc;
}

/**
 * Computes CRC code of a stream of data
 * where the data chunks may arrive out of order.
 * The `updateChunk` method should be called for
 * each data chunk received, and then
 * the `computeFinalCrc` method should be called
 * after all data chunks have been received.
 */
export class CrcTracker {
    private currentCrc: number = -1;
    private lastUpdatedIndex: number = -1;
    private dataBuffer: (ArrayLike<number>|undefined)[];

    constructor(numChunks: number) {
        this.dataBuffer = new Array(numChunks);
    }

    /**
     * Updates the CRC with the specified
     * chunk from the file.
     * @param data
     * @param chunkIndex 
     */
    updateChunk(data: ArrayLike<number>, chunkIndex: number) {
        // TODO: While we expect data chunks to arrive out of order,
        // we still update the CRC code sequentially.
        // To achieve this, we hold chunks in memory until
        // all the preceding chunks have been update.
        // This is a quick solution for simplicity, but can be bad
        // for memory the order is random or last chunks
        // arrive first. We should look into combining
        // CRC codes of chunks whose codes were independtly
        // computed so that we don't have to hold chunks
        // in memory.
        if (this.lastUpdatedIndex === chunkIndex - 1) {
            this.currentCrc = crc32PartialUpdate(this.currentCrc, data);
            this.lastUpdatedIndex = chunkIndex;
            this.updateBufferedChunks();
        } else {
            this.dataBuffer[chunkIndex] = data;
        }
    }

    /**
     * Computes the final crc. This should be called
     * after all the chunks in the final have been
     * updated with updateChunk
     */
    computeFinalCrc() {
        this.updateBufferedChunks();
        this.currentCrc = (this.currentCrc ^ (-1)) >>> 0;
        return this.currentCrc;
    }

    private updateBufferedChunks() {
        for (let index = this.lastUpdatedIndex + 1; index < this.dataBuffer.length; index++) {
            const chunk = this.dataBuffer[index];
            if (!chunk) {
                return;
            }

            this.currentCrc = crc32PartialUpdate(this.currentCrc, chunk);
            this.lastUpdatedIndex = index;

            this.dataBuffer[index] = undefined;
        }
        
    }
}