const express = require('express');
const cors = require('cors');
require('dotenv').config();


const { Pool } = require('pg');

// Create a connection pool using the URL from your .env file
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Test the connection as soon as the server boots up
pool.connect()
    .then(() => console.log("✅ Successfully connected to PostgreSQL!"))
    .catch((err) => console.error("❌ Database connection error:", err.stack));
    

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
    console.log(`Testing my database connection string: ${process.env.DATABASE_URL}`);
});









/*

// ==========================================
// 1. SETUP & IMPORTS
// ==========================================
// Import the 'express' package

const express=require('express');
const cors=require('cors');


require('dotenv').config();
// Import the 'cors' package

// Configure 'dotenv' so the server can read your .env file

// Create the express application instance and store it in a variable called 'app'


// ==========================================
// 2. MIDDLEWARE
// ==========================================
// Tell the app to use the CORS middleware (allows frontend to talk to backend)

// Tell the app to use the express.json() middleware (allows server to read JSON bodies)


// ==========================================
// 3. TEMPORARY DATABASE
// ==========================================
// Create a 'let' array called 'interns' holding one default object (id: 1, name: "Rahul", role: "Frontend Intern")


// ==========================================
// 4. API ROUTES (CRUD)
// ==========================================

// --- 1. READ (GET Request) ---
// Create a GET route at '/api/interns'
    
    // Respond by sending the 'interns' array as JSON


// --- 2. CREATE (POST Request) ---
// Create a POST route at '/api/interns'
    
    // Check if the name sent from the frontend already exists in our array using .find()
    
    // If the existing intern is found:
        // Stop execution and return a 400 status with a JSON error message
        
    // If they do not exist, create a new object:
        // Set 'id' to the current length of the array + 1
        // Set 'name' to the name sent in the request body
        // Set 'role' to the role sent in the request body
        
    // Push this new object into the 'interns' array
    
    // Respond with a JSON success message and the new intern data


// --- 3. UPDATE (PUT Request) ---
// Create a PUT route at '/api/interns/:id'
    
    // Grab the dynamic 'id' from the URL (req.params) and parse it into an integer
    
    // Use .find() to locate the specific intern in the array by their ID
    
    // If the intern is not found:
        // Stop execution and return a 404 status with an error message
        
    // Update the found intern's role using the new role sent in the request body
    
    // Respond with a JSON success message


// --- 4. DELETE (DELETE Request) ---
// Create a DELETE route at '/api/interns/:id'
    
    // Grab the dynamic 'id' from the URL and parse it into an integer
    
    // Update the 'interns' array using .filter() to keep everyone EXCEPT the one with that ID
    
    // Respond with a JSON success message


// ==========================================
// 5. SERVER ACTIVATION
// ==========================================
// Create a PORT variable. Try to get it from process.env.PORT, otherwise default to 3000

// Tell the app to listen on that PORT
    // Inside the callback, console.log that the server is running on localhost
    // console.log your secret DATABASE_PASSWORD from the environment variables to test it

    */