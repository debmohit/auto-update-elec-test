const fs = require('fs');
const { createHash } = require('crypto');

// Read from a file buffer
const filePath = './out/make/AppImage/x64/auto-update-example-1.0.21-x64.AppImage';

// Read the entire content of the file
const content = fs.readFileSync(filePath, 'utf-8');

fs.stat(filePath, (err, stats) => {
    if (err) {
        console.error(`Error getting file stats: ${err.message}`);
        return;
    }

    // Print the file size in bytes
    console.log(`File size: ${stats.size} bytes`);
});

const digest = createHash('sha512').update(content).digest('base64')
// Alternatively, you can read the file line by line
// const lineByLineContent = fs.readFileSync(filePath, 'utf-8').split('\n');

// Print the content of the file
console.log('Content of the file:');
console.log(digest);
