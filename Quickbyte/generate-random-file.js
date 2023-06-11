const fs = require('fs');
const crypto = require('crypto');

const fileSizeInBytes = 400 * 1024 * 1024; // 50MB
const filePath = 'random_file.bin';

// Generate random bytes
const randomBytes = crypto.randomBytes(fileSizeInBytes);

// Write random bytes to file
fs.writeFileSync(filePath, randomBytes);

console.log(`File "${filePath}" generated successfully.`);