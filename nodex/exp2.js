const express = require('express');
const app = express();

// --- 1. Built-in Middleware ---
// Tell the app to automatically parse incoming requests that have JSON payloads
app.use(express.json());

// --- 2. Custom Middleware ---
// Define a custom middleware function that intercepts the request (req), response (res), and a next() callback
const logger = (req, res, next) => {
  // Print the current timestamp, the HTTP method (like GET/POST), and the requested URL to the server console
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Call next() to pass the request to the next step in the pipeline (crucial to prevent the request from hanging)
  next(); 
};

// Apply the logger middleware globally so every single incoming request triggers it
app.use(logger);

// --- 3. Routing ---
// Listen for GET requests at the specific URL path '/users'
app.get('/users', (req, res) => {
  // Send back a JSON response containing an object with an array of user names
  res.json({ users: ["Aman", "Priya"] });
});

// Listen for POST requests at the URL path '/users' (typically used to submit new data)
app.post('/users', (req, res) => {
  // Extract the data sent by the client (this works specifically because we added app.use(express.json()) earlier)
  const newUser = req.body; 
  
  // Set the HTTP response status to 201 (Created) and send back a JSON success message along with the submitted data
  res.status(201).json({ message: "User created", user: newUser });
});

// --- 4. Error Handling Middleware ---
// Define a global error handler (Express knows this is an error handler because it specifically takes 4 arguments)
app.use((err, req, res, next) => {
  // Log the detailed error stack trace to the server's console so developers can debug what went wrong
  console.error(err.stack);
  
  // Send a 500 (Internal Server Error) status code and a safe, generic JSON error message to the client
  res.status(500).json({ error: "Something broke!" });
});

// --- 5. Booting up ---
// Tell the server to open port 3000 and start actively listening for incoming web traffic
// The second argument is a callback function that runs immediately once the server is successfully running
app.listen(3000, () => console.log('Express running on port 3000'));