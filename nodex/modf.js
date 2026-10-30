function add(a,b){        // module.exports.add=add // exports.add = function add(a,b){  
    return a+b
}

function sub(a,b){
    return a-b
}



const mul = (a, b) => a * b;
const div = (a, b) => a / b;

module.exports = {add, sub, mul, div};