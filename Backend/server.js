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
    .then(() => console.log("Successfully connected to PostgreSQL!"))
    .catch((err) => console.error("Database connection error:", err.stack));
    
const app = express();

// Middleware
app.use(cors()); // Allow frontend to connect
app.use(express.json()); // Allow server to read JSON data sent in requests


// 1. READ (GET Request) - Fetch data from database and send to frontend
app.get('/api/interns', async (req, res) => {
    try {
        // Grab everything from the interns table, sorted by ID so the list stays in order
        const allInterns = await pool.query("SELECT * FROM interns ORDER BY id ASC");
        
        // Send the database rows to the frontend UI
        res.json(allInterns.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Database error" });
    }
});


// 2. CREATE (POST Request) - Receive data from frontend
app.post('/api/interns', async (req, res) => {
    try {
        // Grab the data sent from the frontend
        const { name, role } = req.body;

        // 1. Check if the name already exists in the SQL table
        const existingIntern = await pool.query(
            "SELECT * FROM interns WHERE name = $1", 
            [name]
        );
        
        if (existingIntern.rows.length > 0) {
            return res.status(400).json({ message: "This intern already exists!" });
        }

        // 2. Insert the new intern into PostgreSQL permanently
        const newIntern = await pool.query(
            "INSERT INTO interns (name, role) VALUES ($1, $2) RETURNING *",
            [name, role]
        );

        // Send the saved SQL data back to the frontend
        res.json({ message: "Intern added!", data: newIntern.rows[0] });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Database error" });
    }
});


// 3. UPDATE (PUT Request) - Modify existing data in PostgreSQL
app.put('/api/interns/:id', async (req, res) => {
    try {
        const idToUpdate = req.params.id;
        const newRole = req.body.role;
        
        // SQL command to update the role for a specific ID
        const updateIntern = await pool.query(
            "UPDATE interns SET role = $1 WHERE id = $2 RETURNING *",
            [newRole, idToUpdate]
        );
        
        // If no rows were updated, the ID doesn't exist
        if (updateIntern.rows.length === 0) {
            return res.status(404).json({ message: "Intern not found" });
        }

        res.json({ message: "Intern updated successfully!" });
    } 
    catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Database error" });
    }
});


// 4. DELETE Request - Remove data permanently from PostgreSQL
app.delete('/api/interns/:id', async (req, res) => {
    try {
        const idToDelete = req.params.id;
        
        // SQL command to delete the row matching the ID
        const deleteIntern = await pool.query(
            "DELETE FROM interns WHERE id = $1 RETURNING *",
            [idToDelete]
        );
        
        if (deleteIntern.rows.length === 0) {
            return res.status(404).json({ message: "Intern not found" });
        }

        res.json({ message: "Intern removed successfully!" });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Database error" });
    }
});


// Start the server
// Grab the port from .env, or default to 3000 if it fails
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running live on http://localhost:${PORT}`);
    console.log(`Testing my database connection string: ${process.env.DATABASE_URL}`);
});





/*
// Temporary Database (runs in computer memory)
let interns = [
    { id: 1, name: "Rahul", role: "Frontend Intern" }
];

// 1. READ (GET Request) - Send data to frontend

app.get('/api/interns', (req, res) => {
    res.json(interns);
});

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

*/