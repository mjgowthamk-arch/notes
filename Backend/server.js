const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors()); // Allow frontend to connect
app.use(express.json()); // Allow server to read JSON data sent in requests

// Temporary Database (runs in computer memory)
let interns = [
    { id: 1, name: "Rahul", role: "Frontend Intern" }
];

// 1. READ (GET Request) - Send data to frontend
app.get('/api/interns', (req, res) => {
    res.json(interns);
});

// 2. CREATE (POST Request) - Receive data from frontend
// 2. CREATE (POST Request) - Receive data from frontend
app.post('/api/interns', (req, res) => {
    // Check if the name already exists in our array
    const existingIntern = interns.find(intern => intern.name === req.body.name);
    
    if (existingIntern) {
        // If they exist, send an error back and STOP
        return res.status(400).json({ message: "This intern already exists!" });
    }

    // If they don't exist, add them normally
    const newIntern = {
        id: interns.length + 1,
        name: req.body.name,
        role: req.body.role
    };
    interns.push(newIntern);
    res.json({ message: "Intern added!", data: newIntern });
});


// 3. UPDATE (PUT Request) - Modify existing data
app.put('/api/interns/:id', (req, res) => {
    const idToUpdate = parseInt(req.params.id);
    
    // Find the specific intern in our array
    const intern = interns.find(i => i.id === idToUpdate);
    
    if (!intern) {
        return res.status(404).json({ message: "Intern not found" });
    }

    // Update their role with the new data sent from frontend
    intern.role = req.body.role;
    
    res.json({ message: "Intern updated successfully!" });
});

// 4. DELETE Request - Remove data
app.delete('/api/interns/:id', (req, res) => {
    // req.params.id grabs the number from the URL
    const idToDelete = parseInt(req.params.id);
    
    // Filter out the intern with that ID
    interns = interns.filter(intern => intern.id !== idToDelete);
    
    res.json({ message: "Intern removed successfully!" });
});

// Start the server
// Grab the port from .env, or default to 3000 if it fails
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running live on http://localhost:${PORT}`);
    console.log(`Testing my secret password: ${process.env.DATABASE_PASSWORD}`);
});
