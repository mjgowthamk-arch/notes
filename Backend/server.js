const express = require('express');
const cors = require('cors');
require('dotenv').config();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); 

const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Test the connection as soon as the server boots up
pool.connect()
    .then(() => console.log("Successfully connected to PostgreSQL!"))
    .catch((err) => console.error("Database connection error:", err.stack));
    
const app = express();

app.use(cors()); // Allow frontend to connect
app.use(express.json()); // Allow server to read JSON data sent in requests

// register route to create a new user with hashed passwords
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Safely register new users as a standard 'user'
        const newUser = await pool.query(
            "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'user') RETURNING id, username, role",
            [username, hashedPassword]
        );

        res.status(201).json({
            message: "User registered successfully!",
            user: newUser.rows[0]
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Database error during registration" });
    }
});

// Login route to generate a JWT token
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Find the user in your PostgreSQL database
        const userResult = await pool.query(
            "SELECT * FROM users WHERE username = $1", 
            [username]
        );

        // If user doesn't exist
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: "Invalid username or password!" });
        }

        const user = userResult.rows[0]; // This is the user row from your DB

        // 2. Compare the typed password with the hashed password stored in PostgreSQL
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid username or password!" });
        }

        // 3. Password is correct! Create the JWT payload
        const userPayload = {
            id: user.id,
            username: user.username,
            role: user.role // pulled securely from the database row, not client!
        };

        // 4. Sign the token
        const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // 5. Send token back
        res.json({
            message: "Logged in successfully!",
            token: token
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Server error during login" });
    }
});

// Middleware to check for valid JWT token
function requireAccess(req, res, next) {
    try {
        // Grab token from Authorization header (Bearer token)
        const authHeader = req.get('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Access denied. No token provided!" });
        }

        const token = authHeader.split(' ')[1];

        // Verify the token matches the secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach user info to request object so downstream routes know who is acting
        req.user = decoded;
        
        next(); // Token is valid, proceed to the actual route handler!
    } 
    catch (error) {
        return res.status(403).json({ message: "Invalid or expired token!" });
    }
}

function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next(); // They are an admin, proceed!
    } else {
        res.status(403).json({ message: "Access forbidden: Admins only!" });
    }
}


// Get all registered users (Admin only)
app.get('/api/users', requireAccess, requireAdmin, async (req, res) => {
    try {
        const allUsers = await pool.query("SELECT id, username, role FROM users ORDER BY id ASC");
        res.json(allUsers.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Database error" });
    }
});


app.get('/api/interns', requireAccess, async (req, res) => {
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


app.post('/api/interns', requireAccess, requireAdmin, async (req, res) => {
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


app.put('/api/interns/:id', requireAccess, requireAdmin, async (req, res) => {
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


app.patch('/api/interns/:id', requireAccess, requireAdmin, async (req, res) => {
    try {
        const idToUpdate = req.params.id;
        const { name, role } = req.body;
        
        // COALESCE ensures that if a field is not sent (undefined/null), 
        // PostgreSQL keeps the existing value in the database instead of overwriting it.
        const updateIntern = await pool.query(
            `UPDATE interns 
             SET name = COALESCE($1, name), 
                 role = COALESCE($2, role) 
             WHERE id = $3 
             RETURNING *`,
            [
                name !== undefined ? name : null, 
                role !== undefined ? role : null, 
                idToUpdate
            ]
        );
        
        // If no rows were updated, the ID doesn't exist
        if (updateIntern.rows.length === 0) {
            return res.status(404).json({ message: "Intern not found" });
        }

        res.json({ 
            message: "Intern updated successfully!", 
            data: updateIntern.rows[0] 
        });
    } 
    catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Database error" });
    }
});


app.delete('/api/interns/:id', requireAccess, requireAdmin, async (req, res) => {
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