/**
 * For downloads larger than this size,
 * a warning should be displayed on browsers which don't
 * support optimal download experience.
 */
export const MIN_SIZE_FOR_DOWNLOAD_WARNING = 1 * 1024 * 1024 * 1024; // 1GB
/**
 * For zip downloads larger than this size,
 * a warning should be displayed about possible limited support
 * for Zip 64 on some platforms and a recommendation for
 * a third party extraction tool with Zip64 support, like 7Zip.
 */
export const MIN_SIZE_FOR_ZIP64_TIP = 4 * 1024 * 1024 * 1024; //4GB