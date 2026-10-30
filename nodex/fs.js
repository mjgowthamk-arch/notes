let fs=require('fs')

fs.readFile('calc.js','utf8',function(err,data){
    console.log(data)
})

/*
fs.writeFile('file.js','console.log("done");', function(er){
    console.log('file created')
})
*/

fs.appendFile('file.js','console.log("done");', function(er){
    console.log('Data saved')
})

/*
fs.unlink('file.js', function(err){
    console.log('file deleted')
})
*/