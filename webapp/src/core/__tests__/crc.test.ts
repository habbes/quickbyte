import { crc32, CrcTracker } from '../crc.js';
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('CRC32', () => {
    const FILE_PATH = `${__dirname}/random_file_10737_bytes.bin`;

    describe('crc32 function', () => {
        test('It computes the correct crc32 for a blob', () => {
            const data = readFileSync(FILE_PATH);
            const crc = crc32(data);
            expect(crc).toBe(0xa51b82bf);
        });
    });

    describe('CRCTracker', () => {
        test('Computes correct crc32 when one chunk is used', () => {
            const data = readFileSync(FILE_PATH);
            const expected = crc32(data);
            const tracker = new CrcTracker(1);
            tracker.updateChunk(data, 0);
            const crc = tracker.computeFinalCrc();
            expect(crc).toBe(expected);
        });

        test('Computes correct crc32 across multiple sequential chunks', () => {
            const data = new Uint8Array(readFileSync(FILE_PATH));
            const expected = crc32(data);
            const chunkSize = 1024;
            const numChunks = Math.ceil(data.length / chunkSize);
            const tracker = new CrcTracker(numChunks);

            for (let i = 0; i < numChunks; i++) {
                const offset = i * chunkSize;
                const chunk = data.slice(offset, offset + chunkSize);
                tracker.updateChunk(chunk, i);
            }

            const crc = tracker.computeFinalCrc();
            expect(crc).toBe(expected);
        });

        test('Computes correct crc32 across multiple chunks out of order', () => {
            const data = new Uint8Array(readFileSync(FILE_PATH));
            const expected = crc32(data);
            const chunkSize = 1024;
            const numChunks = Math.ceil(data.length / chunkSize);
            const tracker = new CrcTracker(numChunks);

            expect(numChunks).toBe(11); // sanity check

            const chunkOrder = [10, 1, 2, 0, 3, 5, 7, 6, 4, 9, 8];
            for (const chunkIndex of chunkOrder) {
                const offset = chunkIndex * chunkSize;
                const chunk = data.slice(offset, offset + chunkSize);
                tracker.updateChunk(chunk, chunkIndex);
            }

            const crc = tracker.computeFinalCrc();
            expect(crc).toBe(expected);
        });
    });
});

