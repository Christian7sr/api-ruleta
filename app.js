const express = require('express');
const app = express()

app.get('/', function(req, res){
    res.json({"name":"pepito"});
});

app.listen(2112, ()=> {
    console.log('Server successfully started');
})