const express = require('express');
const fs = require('fs');
const https = require('https');
const { Pool } = require('pg');
const path = require('path'); 

// Security & Auth Packages
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;

require('dotenv').config();
const app = express();

// =========================================================================
// CONCEPT 3: PROTECTING AGAINST COMMON VULNERABILITIES (XSS & CSRF)
// =========================================================================

// 1. XSS (Cross-Site Scripting) Protection
// Helmet automatically sets secure HTTP headers (like Content-Security-Policy) 
// to prevent hackers from injecting malicious JavaScript into your frontend.

// We are telling Helmet: "Keep us secure, but allow inline <script> tags for now"
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Allows your <script> tag
        }
    }
}));
app.use(express.json());
app.use(cookieParser());

// 2. CSRF (Cross-Site Request Forgery) Protection
// This middleware generates a secret token. The frontend must attach this token 
// to any POST request. If a hacker tries to trick the user's browser into submitting 
// a fake form from a different website, it will fail because the hacker doesn't know this token.
const csrfProtection = csrf({ cookie: true });


// =========================================================================
// CONCEPT 3 (Continued): PROTECTING AGAINST SQL INJECTION
// =========================================================================
const pool = new Pool({
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    host: 'localhost',
    port: 5432
});

const getUserByEmail = async (email) => {
    // 3. SQL Injection Protection
    // Using $1 (Parameterized Queries) forces the database to treat the input 
    // strictly as a text string. If a hacker types "DROP TABLE login;" into 
    // the email box, the database will just look for a user with that weird name.
    const result = await pool.query('SELECT * FROM login WHERE email = $1', [email]);
    return result.rows[0];
};


// =========================================================================
// CONCEPT 1: USER AUTHENTICATION (JWT & PASSPORT.JS)
// =========================================================================

// A custom extractor function to pull the JWT out of the HTTP-Only cookie
const cookieExtractor = (req) => {
    let token = null;
    if (req && req.cookies) {
        token = req.cookies['jwt_token'];
    }
    return token;
};

// Configuring Passport.js to use JWT
const jwtOptions = {
    jwtFromRequest: cookieExtractor,
    secretOrKey: 'YOUR_SUPER_SECRET_KEY' // In production, use process.env.JWT_SECRET
};

// Passport acts as our bouncer. It grabs the token, checks the signature, 
// checks the expiration, and if valid, attaches the user payload to req.user.
passport.use(new JwtStrategy(jwtOptions, (jwt_payload, done) => {
    // If the token is valid, we let the user through
    if (jwt_payload && jwt_payload.id) {
        return done(null, { id: jwt_payload.id }); 
    }
    // If token is invalid, reject them
    return done(null, false);
}));

app.use(passport.initialize());


// =========================================================================
// ROUTES
// =========================================================================

// Route to hand the CSRF token to the frontend (Frontend calls this when page loads)
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Login Route (Note: We use csrfProtection here so hackers can't spam fake logins)
app.post('/auth/login', csrfProtection, async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await getUserByEmail(email);
        
        if (!user || user.password !== password) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate the JWT
        const token = jwt.sign({ id: user.id }, 'YOUR_SUPER_SECRET_KEY', { expiresIn: '1h' });

        // Defending against XSS (Part 2): 
        // We save the token in an HTTP-Only cookie. JavaScript cannot read this cookie, 
        // meaning if an XSS attack occurs, the hacker still cannot steal the JWT.
        res.cookie('jwt_token', token, {
            httpOnly: true, 
            secure: false,        // Ensures cookie is only sent over HTTPS
            sameSite: 'strict',  // Extra CSRF defense: cookie only sent from your exact domain
            maxAge: 3600000      // 1 hour
        });

        res.json({ message: "Logged in successfully" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// =========================================================================
// CONCEPT 2: SECURING API ENDPOINTS
// =========================================================================

// By placing `passport.authenticate('jwt', { session: false })` in the middle of the route,
// we lock this endpoint down. Express will pause the request, pass it to Passport, 
// and only continue to `res.json` if Passport confirms the HTTP-Only cookie is valid.
app.get('/api/dashboard', passport.authenticate('jwt', { session: false }), (req, res) => {
    res.json({ 
        message: "Welcome to the secure dashboard!",
        userId: req.user.id 
    });
});


// =========================================================================
// CONCEPT 4: HTTPS IN NODE.JS
// =========================================================================

// HTTPS encrypts the connection between the browser and the server.
// Without this, hackers on the same Wi-Fi network could intercept the raw text 
// and steal the passwords and JWTs while they travel through the air (Man-in-the-Middle attack).
/*
const httpsOptions = {
    key: fs.readFileSync('server.key'),   // The private key
    cert: fs.readFileSync('server.cert')  // The public certificate
};

// We wrap our Express 'app' inside the built-in Node HTTPS server
https.createServer(httpsOptions, app).listen(3000, () => {
    console.log('Secure HTTPS Server running on https://localhost:3000');
});
*/

// Serve your HTML page
app.get('/login', (req, res) => {
    // Make sure the path matches where you saved jwt.html
    res.sendFile(path.join(__dirname, 'jwt2.html')); 
});


app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});