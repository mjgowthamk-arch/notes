const fs = require('fs/promises');

const manageFiles = async () => {
  try {
    // 1. Write to a file
    await fs.writeFile('notes.txt', 'Learning Node.js is fun!');
    console.log('File created successfully.');

    // 2. Read from a file (specify 'utf-8' to get text, not a Buffer)
    const data = await fs.readFile('notes.txt', 'utf-8');
    console.log('File content:', data);

    // 3. Create a directory
    await fs.mkdir('backup-folder', { recursive: true });
    console.log('Directory created.');

    // 4. Read directory contents
    const files = await fs.readdir('.');
    console.log('Items in current folder:', files);

  } catch (err) {
    console.error('File operation failed:', err);
  }
};

manageFiles();