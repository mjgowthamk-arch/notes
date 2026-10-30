const express=require('express')
const server=express()

require('dotenv').config();

const {Pool}=require('pg')

const pool= new Pool ({
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT
});

server.get('/api/users/callback', (req,res)=>{
    const query='select * from users';

    // The pg library accepts a callback as the second argument
    pool.query(query, (err,result)=>{
        if (err){
            console.error('Database error:', err)
            return res.status(500).json({error : 'failed to fetch users'})
        }        

        // Result object contains rows from the database
        res.json({message : 'fetch success', data: result.rows})
    })
})


server.get('/api/users/promise', (req, res) => {

    const query = 'select * from users';
    // If no callback is provided, pool.query returns a Promise
    pool.query(query)

    .then((result) => {
        res.json({ message: "fetch success", data: result.rows });
    })

    .catch((error) => {
        console.error('Database error:', error);
        res.status(500).json({ error: "Failed to fetch users" });
    });
});



server.get('/api/users/async', async (req, res) => {
    const query = 'select * from users';

    try {
        // The server doesn't block here. It waits for Postgres to return the data,
        // while Node.js goes off to handle other incoming API requests.
        const result = await pool.query(query);
        res.json({ message: "fetch success ggg", data: result.rows });
    } 

    catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

server.listen(2000, ()=>{
    console.log('Server is running on http://localhost:2000');
})


