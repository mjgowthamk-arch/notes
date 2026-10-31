// 1. Import BOTH versions of fs
const fsPromises = require('fs/promises'); // For await (writeFile, readFile, mkdir)
const fs = require('fs');                  // For streams (createReadStream)

const manageFiles = async () => {
  try {
    await fsPromises.writeFile('notes.txt', 'Learning Node.js is fun!');
    console.log('File created successfully.');

    // 'utf-8' to get text, not a Buffer)
    const data = await fsPromises.readFile('notes.txt', 'utf-8');
    console.log('File content:', data);

    await fsPromises.mkdir('backup-folder', { recursive: true });
    console.log('Directory created.');

    const files = await fsPromises.readdir('.');
    console.log('Items in current folder:', files);

    // --- New Stream Code Integrated ---
    console.log('Starting video copy...');
    
    // Read data in small chunks
    const readStream = fs.createReadStream('large-video.mp4');
    const writeStream = fs.createWriteStream('copy-video.mp4');

    // To make streams work with async/await, we wrap the pipe process in a Promise.
    // This forces the function to pause here until the stream finishes copying.
    await new Promise((resolve, reject) => {

      // Pipe connects the read stream directly to the write stream
      readStream.pipe(writeStream);
      
      // Resolve the promise when the writing is fully complete
      writeStream.on('finish', () => resolve());
      
      // Reject the promise (triggering your catch block) if an error occurs
      writeStream.on('error', (err) => reject(err));
      readStream.on('error', (err) => reject(err));
    });

    console.log('Video copied successfully.');

  } catch (err) {
    console.error('File operation failed:', err);
  }
};

manageFiles();