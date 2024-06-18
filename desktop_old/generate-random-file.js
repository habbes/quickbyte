const fs = require('fs');
const crypto = require('crypto');

const [_, __, sizeInGBInput, filePathInput] = process.argv;

if (!sizeInGBInput) {
    printHelpAndExit(1);
}

const sizeInGB = Number(sizeInGBInput);
if (isNaN(sizeInGB)) {
    console.error(`Invalid ${sizeInGB}. Size should be a number`);
    printHelpAndExit(1);
}

const fileSizeInBytes = sizeInGB * 1024 * 1024 * 1024;
const filePath = filePathInput || `random_file_${sizeInGB}gb.bin`;

console.log(`Generating random file of size ${sizeInGB}GB at ${filePath}...`);

let bytesRemaining = fileSizeInBytes;
const maxBlockSize = 10 * 1024 * 1024; // 10MB

while (bytesRemaining > 0) {
    const blockSize = Math.min(bytesRemaining, maxBlockSize);
    const randomBlock = crypto.randomBytes(blockSize);
    fs.appendFileSync(filePath, randomBlock);
    bytesRemaining -= blockSize;
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    const progress = 100 * (fileSizeInBytes - bytesRemaining) / fileSizeInBytes;
    process.stdout.write(`Progress ${progress.toFixed(2)}%`);
}

console.log('');

console.log(`File "${filePath}" generated successfully.`);


function printHelpAndExit(exitCode = 0) {
    console.log(`USAGE: node generate_random_file <size_in_gb> [output_file]`);
    console.log('');
    console.log('EXAMPLES:');
    console.log(`node generate_random_file 10`);
    console.log(`node generate_random_file 0.23 some_file.bin`);
    process.exit(exitCode);
}