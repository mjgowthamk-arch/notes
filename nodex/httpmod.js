// 1. Import built-in Node.js modules (No external libraries like Express are used here)
const http = require('http');           // The core module to create a web server
const fs = require('fs/promises');      // The File System module to read files from your computer (using modern async/await)
const path = require('path');           // A utility to safely combine folder and file names

// 2. Create the server
// This is the raw, "under-the-hood" way to build a server. 
// Express actually uses this exact function behind the scenes!
const server = http.createServer(async (req, res) => {
  
  // 3. Manual Routing
  // Without Express, you don't have app.get() or app.post(). 
  // You have to manually check the URL and the Method using if/else statements.
  if (req.url === '/' && req.method === 'GET') {
    
    // res.writeHead sets the HTTP status code (200 OK) and the headers.
    // 'Content-Type' tells the browser: "Hey, the data I'm sending is JSON!"
    res.writeHead(200, { 'Content-Type': 'application/json' });
    
    // res.end sends the actual data and closes the connection.
    // Without Express's res.json(), we have to manually convert our object to a JSON string first.
    res.end(JSON.stringify({ message: "Home API endpoint" }));
  } 
  
  // 4. Serving a static file manually
  // If the user specifically types '/index.html' in their browser...
  else if (req.url === '/index.html') {
    try {
      // __dirname is the current folder. path.join safely combines it with 'index.html'
      // This ensures it works on both Windows (\) and Mac/Linux (/) folder structures.
      const filePath = path.join(__dirname, 'index.html');
      
      // Tell Node.js to read the file from your hard drive. 
      // 'await' pauses the code until the file is fully read.
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Tell the browser: "Success (200), and I am sending you an HTML webpage!"
      res.writeHead(200, { 'Content-Type': 'text/html' });
      
      // Send the actual HTML file contents to the browser
      res.end(content);
      
    } catch (err) {
      // Manual Error Handling: If fs.readFile fails (e.g., you forgot to create index.html),
      // the code jumps here so the server doesn't crash.
      res.writeHead(404); // Send a 404 Not Found status
      res.end("File not found");
    }
  } 
  
  // 5. Catch-All (404 Fallback)
  // If the user asks for a URL that didn't match any of our 'if' statements above...
  else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

// 6. Booting the Server
// Opens port 3000 to listen for incoming requests, exactly like Express does.
server.listen(3000, () => console.log('Raw HTTP server running'));