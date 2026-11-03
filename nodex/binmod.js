// Built-in Node.js modules
const http = require('http');           // The core module to create a web server
const fs = require('fs/promises');      // The File System module to read files from your computer (using modern async/await)
const path = require('path');           // A utility to safely combine folder and file names

// Create server

const server = http.createServer(async (req, res) => {
  
  // Manual Routing
  if (req.url === '/' && req.method === 'GET') {
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: "Home Page" }));
  } 
  
  // Serving a static file manually
  else if (req.url === '/color.html') {
    try {
      const filePath = path.join(__dirname, '../practice/color.html'); 
      const content = await fs.readFile(filePath, 'utf-8');
      
      res.writeHead(200, { 'Content-Type': 'text/html' });      
      res.end(content);
      
    } catch (err) {
      // Manual Error Handling
      res.writeHead(404); // Not Found status
      res.end("File not found");
    }
  } 
  
  else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(3000, () => console.log('Server running'));