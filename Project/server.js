// 1. Import required modules: express, dotenv, cors, pg, bcrypt, jsonwebtoken
const express=require('express');
const dotenv=require('dotenv');
const cors=require('cors');
const {Pool}=require('pg');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');

// 2. Configure dotenv to read your .env file
dotenv.config();

// 3. Initialize the express app
const app=express();

// 4. Set up middleware: app.use(cors()) and app.use(express.json())
app.use(cors());
app.use(express.json())

// 5. Create a new pg.Pool using your database credentials from process.env
const pool=new Pool({
    user:process.env.DB_USER,
    database:process.env.DB_NAME,
    password:process.env.DB_PASSWORD,
    host:process.env.DB_HOST,
    port:process.env.DB_PORT,
});

pool.connect()
.then(()=> console.log("Database connected"))
.catch((err)=> console.log("error occured when connecting with DB:", err.stack));

// 6. Connect to the pool and log a success or error message

// ==========================================
// MIDDLEWARE: VERIFY JWT
// ==========================================
// 7. Create a function named authenticateToken(req, res, next)
    // a. Get the 'authorization' header from req.headers
    // b. Extract the token from the "Bearer <token>" string
    // c. If no token, return a 401 response (Access Denied)
    // d. Use jwt.verify() to check the token using process.env.JWT_SECRET
    // e. If verification fails, return a 403 response (Invalid token)
    // f. If successful, attach the decoded user data to req.user and call next()

function authToken(req, res, next){
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token){
        return res.status(401).json({message:'No token, Access Denied!'})
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err,user)=>{  // assign to a varable => undefined
        if (err) return res.status(403).json({message:'Invalid Token'})
        req.user=user;
        next();
    });
}

// ==========================================
// TEMPORARY DB SEED ROUTE
// ==========================================
// 8. Create a GET route '/seed' to initialize the database
    // a. Inside a try-catch block, hash the password '123' using bcrypt.hash()
    // b. Clear the users table (TRUNCATE TABLE users CASCADE)
    // c. Insert the HR Admin and 2 Managers into the users table using the hashed password
    // d. Send a success response
    // e. Catch and send any errors

app.get('/seed', async (req, res)=>{
    try {
        const hashedPass=await bcrypt.hash('123', 10);
        const t=await pool.query('truncate table users cascade');  // returns result obj => { command: 'TRUNCATE', rowCount: null, rows: [] }
        const i=await pool.query(`insert into users (name, email, password, role) values
            ('HR Admin', 'admin', $1, 'admin'),
            ('Manager 1', 'manager1', $1, 'manager'),
            ('Manager 2', 'manager2', $1, 'manager')`, 
            [hashedPass])
            
            res.status(200).json({ message: 'Database seeded successfully!' });

            console.log("Truncate command:", t);                                  
            console.log("Rows inserted:", i);


    } catch (err) {
        console.log(err.stack)
        res.status(500).json({message:'Internal server error'})
    }
});

// ==========================================
// 1. AUTHENTICATION (Login)
// ==========================================
// 9. Create a POST route '/login'
    // a. Extract email, password, and role from req.body
    // b. Query the users table for the given email and role
    // c. If no user is found, return 401 (Invalid credentials)
    // d. Use bcrypt.compare() to check the provided password against the database hash
    // e. If the password doesn't match, return 401 (Invalid credentials)
    // f. If the user is an 'intern', query the interns table to get their designation
    // g. Generate a JWT token using jwt.sign() containing user_id, email, and role
    // h. Remove the password hash from the user object before sending it to the frontend
    // i. Return a 200 response with the token and user object

app.post('/login', async (req,res)=>{

    try {
        const {email, password, role} = req.body    
        const result=await pool.query('Select * from users where email=$1 and role=$2',[email, role]);

        if (result.rows.length === 0){
            return res.status(401).json({message:'Invalid credentials'});    
        }

        const user=result.rows[0];    
        const validPass=await bcrypt.compare(password, user.password)

        if (!validPass) {
            return res.status(401).json({message:'Invalid credentials'});    
        }

        if (user.role==='intern'){
            const internResult=await pool.query('select designation from interns where intern_id=$1', [user.user_id]);
            user.designation=internResult.rows[0].designation;    
        }

        const payload={
            user_id:user.user_id,
            email:user.email,
            role:user.role
        }
    
        const token= jwt.sign(payload, process.env.JWT_SECRET, {expiresIn:'8h'})    
        delete user.password;
 
        res.status(200).json({message:'Login successful', token, user})

    } catch (err){
        res.status(500).json({message:'Internal server error'})
    }
});

// ==========================================
// 2. DATA FETCHING (Protected)
// ==========================================
// 10. Create a GET route '/api/interns' and apply the authenticateToken middleware
    // a. Query the database, joining 'users' (interns), 'interns' (details), and 'users' (managers)
    // b. Query all tasks from the tasks table
    // c. Format the data into an array of objects matching the frontend's expected structure (name, email, role, manager, and an array of their specific tasks)
    // d. Return the formatted array as JSON

app.get('/api/interns', authToken, async (req,res)=>{
    try{
        const result=await pool.query(`
            select u.user_id, u.name, u.email, i.designation as role, m.name as manager
            from users u
            inner join interns i on u.user_id = i.intern_id
            inner join users m on i.manager_id = m.user_id`);

        const taskResult=await pool.query('select * from tasks');

        const interns = result.rows;
        const tasks = taskResult.rows;

        const formattedData= interns.map((intern)=>{
            return {
                name: intern.name,
                email: intern.email,
                role: intern.role,
                manager: intern.manager,
                // Filter the tasks array to only include tasks belonging to THIS intern
                tasks: tasks.filter(t => t.intern_id === intern.user_id).map(t => {
                    return {
                        id: t.task_id,
                        title: t.title,
                        status: t.status,
                        score: t.score === null ? '-' : t.score, // Frontend expects '-' if not graded
                        feedback: t.feedback || '',
                        assignedDate: new Date(t.assigned_date).toLocaleDateString('en-GB')
                    };
                })
            };
        });

        res.status(200).json(formattedData);

        } catch (err){
            console.log(err.stack)
            res.status(500).json({message:'Internal server error'})
        }
    });

// ==========================================
// 3. ADMIN ENDPOINTS (Protected)
// ==========================================
// 11. Create a POST route '/api/interns' and apply authenticateToken
    // a. Extract name, email, role, and manager from req.body
    // b. Hash a default password (e.g., '123') using bcrypt
    // c. Start a database transaction (BEGIN)
    // d. Insert the new user into the users table and return the new user_id
    // e. Query the users table to find the manager's user_id based on their name
    // f. Insert the new intern into the interns table using the new user_id and manager_id
    // g. Commit the transaction and return a success message

app.post('/api/interns', authToken, async (req,res)=>{
    const client = await pool.connect();
    try {
        const {name, email, role, manager} = req.body;
        const hashPass = await bcrypt.hash('123', 10);

        await client.query('BEGIN');

        const result = await client.query("INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'intern') RETURNING user_id", [name, email, hashPass]);

        const newUserId = result.rows[0].user_id;

        const findManager = await client.query('SELECT user_id FROM users WHERE name=$1 AND role=$2', [manager, 'manager']);

        const managerId = findManager.rows[0].user_id;

        await client.query("INSERT INTO interns (intern_id, designation, manager_id) VALUES ($1, $2, $3)", [newUserId, role, managerId]);
        
        await client.query('COMMIT');
        
        res.status(201).json({ message: 'Intern created successfully' });
        
    } catch (err){
        await client.query('ROLLBACK'); 
        console.log(err.stack);
        res.status(500).json({message:'Internal server error'})
    } finally {
        client.release(); 
    }
});

// 12. Create a DELETE route '/api/interns/:email' and apply authenticateToken
    // a. Delete the user from the users table where the email matches req.params.email
    // b. Return a success message

app.delete('/api/interns/:email', authToken, async (req,res)=>{
    const email=req.params.email;
    try {
        await pool.query('delete from users where email=$1',[email]);
        res.status(200).json({message:'Intern deleted'})  
    } catch (err){
        console.log(err.stack);
        res.status(500).json({message:"Internal server error"})
    }
});
// ==========================================
// 4. MANAGER & TASK ENDPOINTS (Protected)
// ==========================================
// 13. Create a POST route '/api/tasks' and apply authenticateToken
    // a. Extract internEmail and title from req.body
    // b. Query the users table to get the intern's user_id
    // c. Insert the new task into the tasks table
    // d. Return a success message
app.post('/api/tasks', authToken, async (req, res) => {
    const { internEmail, title } = req.body;
    try {
        const result = await pool.query('SELECT user_id FROM users WHERE email=$1', [internEmail]);
        
        if(result.rows.length === 0) {
            return res.status(404).json({ message: "Intern not found" });
        }

        await pool.query('INSERT INTO tasks (intern_id, title) VALUES ($1,$2)', [result.rows[0].user_id, title]);
        res.status(201).json({ message: 'Task assigned' });

    } catch (err) {
        console.log(err.stack);
        res.status(500).json({ message: "Internal server error" });
    }
});

// 14. Create a PUT route '/api/tasks/:id/score' and apply authenticateToken
    // a. Extract title, score, and feedback from req.body
    // b. Update the tasks table where task_id matches req.params.id
    // c. Return a success message

app.put('/api/tasks/:id/score', authToken, async (req,res)=>{
    const {title, score, feedback}=  req.body;
    const id=req.params.id;
    try {
        const result=await pool.query('update tasks set title=$1, score=$2, feedback=$3 where task_id=$4',[title, score==='-' || score==='' ? null : score, feedback, id]);
        res.status(200).json({message:'Score saved'})
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 15. Create a DELETE route '/api/tasks/:id' and apply authenticateToken
    // a. Delete the task from the tasks table where task_id matches req.params.id
    // b. Return a success message

app.delete('/api/tasks/:id', authToken, async(req,res)=>{
    const id=req.params.id;
    try {
        const result=await pool.query('Delete from tasks where task_id =$1', [id])
        res.status(200).json({message:'Task Deleted'})
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 16. Create a PUT route '/api/tasks/:id/status' and apply authenticateToken
    // a. Update the status in the tasks table where task_id matches req.params.id
    // b. Return a success message

app.put('/api/tasks/:id/status', authToken, async(req,res)=>{
    const id=req.params.id;
    const status=req.body.status

     try {
        const result=await pool.query('update tasks set status=$1 where task_id=$2', [status,id])
        res.status(200).json({message:'Status Updated'})
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 17. Start the server using app.listen on process.env.PORT

app.listen(3000, ()=> console.log('Server running on port 3000'))