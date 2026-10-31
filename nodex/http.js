let http = require('http')


http.createServer(function(req,res){
    res.writeHead(200,{'Content-Type':'text/html'})
    res.write('welcome to node')
    console.log('working')
    res.end('end')
}).listen(8000)