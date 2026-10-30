const express= require('express');
const app=express();

app.get('/', function(req,res){
    res.send('Hello world')
})

app.get('/welcome', function(req,res){
    const q=req.query.q
    res.send('Welcome '+ q)
})

app.get('/welcome/:id', function(req,res){
    const id=req.params.id
    res.send('hi '+ id)
})


app.listen(8000, function(){
    console.log('Running...')
})