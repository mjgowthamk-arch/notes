const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors()); 

const { Pool } = require('pg'); 

const pool= new Pool ({
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT
});

// 1. Preventing SQL Injection with Parameterized Queries ($1)
const getUserByEmail = async (email) => {
    // SAFE: Postgres treats $1 strictly as a string value, never as executable code
    const result = await pool.query('SELECT * FROM login WHERE email = $1', [email]);
    return result.rows[0];
};

// 2. Generating a JWT
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, 'YOUR_SECRET_KEY', { expiresIn: '1h' });
};

// 3. JWT Middleware to protect API endpoints
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"
    
    if (!token) {
        return res.status(401).json({ error: "Access Denied" });
    }

    jwt.verify(token, 'YOUR_SECRET_KEY', (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid Token" });
        req.user = user; // Attach decoded user payload to request
        next();
    });
};

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'jwt.html'));
});

// 4. Using getUserByEmail and generateToken in a Login Route
app.post('/auth', async (req, res) => {
    try{
        const { email, password } = req.body;
        // Call the database function
        const user = await getUserByEmail(email);
        if (!user || user.password !== password) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        // Call the token function
        const token = generateToken(user.id);
        res.json({ token: token });
    }

    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error during login" });
    }
});

// 5. Using authenticateToken to protect a route

app.get('/dashboard', authenticateToken, (req, res) => {

    res.json({ message: "Welcome to your private dashboard", userId: req.user.id });
});

app.listen(3000, () => console.log('Server running on port 3000'));