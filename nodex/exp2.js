const express = require('express');
const app = express();

// 1. Built-in Middleware: Parses incoming JSON body data
app.use(express.json());

// 2. Custom Middleware: Logs every request
const logger = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next(); // Critical: Moves to the next step
};
app.use(logger);

// 3. Routing
app.get('/users', (req, res) => {
  res.json({ users: ["Aman", "Priya"] });
});

app.post('/users', (req, res) => {
  const newUser = req.body; // Accessible because of express.json() middleware
  res.status(201).json({ message: "User created", user: newUser });
});

// 4. Error Handling Middleware (Always takes 4 arguments)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!" });
});



app.listen(3000, () => console.log('Express running on port 3000'));