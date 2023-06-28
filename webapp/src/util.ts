
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = 1024 * 1024 * 1024;
const BYTES_PER_TB = 1024 * BYTES_PER_GB;

export function humanizeSize(bytes: number): string {
    if (bytes < BYTES_PER_KB) {
        return `${bytes} Bytes`;
    }

    if (bytes < BYTES_PER_MB) {
        const kbs = Math.ceil(bytes / BYTES_PER_KB);
        return `${kbs} KB`;
    }

    if (bytes < BYTES_PER_GB) {
        const mbs = Math.ceil(bytes / BYTES_PER_MB);
        return `${mbs} MB`;
    }

    if (bytes < BYTES_PER_TB) {
        const gbs = Math.ceil(bytes / BYTES_PER_GB);
        return `${gbs} GB`;
    }

    const tbs = Math.ceil(bytes / BYTES_PER_TB);
    return `${tbs} TB`;
}