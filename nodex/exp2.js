const express = require('express');
const app = express();

// Built-in Middleware

// Automatically parse incoming requests that have JSON payloads
app.use(express.json());

// Custom Middleware

const logger = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);  
  next(); 
};

app.use(logger);

// Routing 

app.get('/users', (req, res) => {
  // JSON response
  res.json({ users: ["Aman", "Priya"] });
});

app.post('/users', (req, res) => {
  // Extract the data sent by the client // this works because app.use(express.json())
  const newUser = req.body; 

  res.status(201).json({ message: "User created", user: newUser });
});

// Handling Middleware

// Global error handler (takes 4 arguments)
app.use((err, req, res, next) => {

  console.error(err.stack);
  
  res.status(500).json({ error: "Something broke!" });
});


app.listen(3000, () => console.log('Express running on port 3000'));