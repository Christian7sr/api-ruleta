const express = require('express');
const app = express();
const redisClient = require('./redis-client');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 2112;



app.get('/', function(req, res){
    res.json({"name":"pepito"});
});

app.get('/newRoulette', async function(req, res){
    let uuid = uuidv4();

    await redisClient.rpushAsync('allroulettes', uuid);
    await redisClient.setAsync('roulettes', uuid);
    await redisClient.setAsync(uuid, 1);
    const newId = await redisClient.getAsync('roulettes');
    return res.json({"id":newId});
});

app.post('/rouletteState', async function (req, res) {
    let roulette = req.body.id;
    let state= await redisClient.getAsync(roulette);
    if(state) res.success=true;
    else res.success=false;
    return res.success;
});

app.get('/allRoulettes', async function(req, res){
    let obj;

    const allIds= await redisClient.lrangeAsync('allroulettes', 0, -1);
    // res.json(object);
    return res.json(allIds);
});



app.listen(PORT, ()=> {
    console.log('Server successfully started');
})