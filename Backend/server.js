const express = require('express');
const cors = require('cors');
require('dotenv').config();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); 

const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

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


// Define Swagger Options / Metadata
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Intern Tracker API',
            version: '1.0.0',
            description: 'A secure REST API with JWT authentication and Role-Based Access Control',
        },
        servers: [
            {
                url: 'http://localhost:3000',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token obtained from /api/login',
                },
            },
        },
    },
    // Tells swagger-jsdoc where to look for documentation comments (current file)
    apis: ['./server.js'], 
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));


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

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Log in to get a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *          application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - username
 *                 - password
 *               properties:
 *                 username:
 *                   type: string
 *                 password:
 *                   type: string
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       401:
 *         description: Invalid username or password
 */

// Login route to generate a JWT token
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Find the user in your PostgreSQL database
        const userResult = await pool.query(
            "SELECT * FROM users WHERE username = $1", 
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: "Invalid username or password!" });
        }

        const user = userResult.rows[0]; // User row from your DB

        // 2. Compare the typed password with the hashed password stored in PostgreSQL
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid username or password!" });
        }

        // 3. Create the JWT payload if password is valid
        const userPayload = {
            id: user.id,
            username: user.username,
            role: user.role // from the database row
        };

        // 4. Sign the token
        const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // 5. Send token back
        res.json({
            message: "Logged in successfully!",
            token: token
        });

    } 
    catch (error) {
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // decodes the payload, if expired or invalid, it will throw an error
        
        req.user = decoded;
        
        next(); 
    } 
    catch (error) {
        return res.status(403).json({ message: "Invalid or expired token!" });
    }
}

function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next(); 
    } 
    else {
        res.status(403).json({ message: "Access forbidden: Admins only!" });
    }
}


// Get all registered users 
app.get('/api/users', requireAccess, requireAdmin, async (req, res) => {
    try {
        const allUsers = await pool.query("SELECT id, username, role FROM users ORDER BY id ASC");
        res.json(allUsers.rows);
    } 
    catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Database error" });
    }
});

/**
 * @swagger
 * /api/interns:
 *   get:
 *     summary: Get all interns (Requires Authentication)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of interns
 *       401:
 *         description: Access denied, no token provided
 */

// Get all registered Interns 
app.get('/api/interns', requireAccess, async (req, res) => {
    try {
        // Grab everything from the interns table, sorted by ID so the list stays in order
        const allInterns = await pool.query("SELECT * FROM interns ORDER BY id ASC");
        
        // Send the database rows to the frontend UI
        res.json(allInterns.rows);
    } 
    catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Database error" });
    }
});

// Create a new intern
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

    } 
    catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Database error" });
    }
});

// Update an intern
app.put('/api/interns/:id', requireAccess, requireAdmin, async (req, res) => {
    try {
        const idToUpdate = req.params.id;
        const { name, role } = req.body;
        
        if (!name || !role) {
            return res.status(400).json({ message: "PUT requests require both 'name' and 'role' for full replacement." });
        }

        const updateIntern = await pool.query(
            "UPDATE interns SET name = $1, role = $2 WHERE id = $3 RETURNING *",
            [name, role, idToUpdate]
        );
        
        if (updateIntern.rows.length === 0) {
            return res.status(404).json({ message: "Intern not found" });
        }

        res.json({ message: "Intern fully replaced successfully!", data: updateIntern.rows[0] });
    } 
    catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Database error" });
    }
});

// Partially update an intern
app.patch('/api/interns/:id', requireAccess, requireAdmin, async (req, res) => {
    try {
        const idToUpdate = req.params.id;
        const { name, role } = req.body;
        
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
        
        if (updateIntern.rows.length === 0) {
            return res.status(404).json({ message: "Intern not found" });
        }

        res.json({ 
            message: "Intern partially updated successfully!", 
            data: updateIntern.rows[0] 
        });
    } 
    catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Database error" });
    }
});

// Delete an intern
app.delete('/api/interns/:id', requireAccess, requireAdmin, async (req, res) => {
    try {
        const idToDelete = req.params.id;
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
    console.log(`Swagger docs available at http://localhost:3000/api-docs`);
});