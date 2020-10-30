const express = require('express');
const app = express();
const redisClient = require('./redis-client');
const { v4: uuidv4 } = require('uuid');
const PORT = process.env.PORT || 2112;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', function(req, res){
    res.send('Welcome to the api Online Roulette');
});
app.get('/newRoulette', async function(req, res){
    let uuid = uuidv4();
    await redisClient.rpushAsync('allroulettes', uuid);
    let nameR='roulette#'+uuid;
    await redisClient.hmsetAsync(nameR,
    {
        'id': uuid,
        'status': 0,
        'max': 10000,
        'bets': ''
    });
    const newRoulette = await redisClient.hgetAllAsync('roulette#'+uuid);
    return res.json(newRoulette.id);
});
app.post('/rouletteOpen', async function (req, res) {
    let roulette = req.body.id;
    roulette='roulette#'+roulette;
    let currentRoulette = await redisClient.hgetAllAsync(roulette);
    currentRoulette.status=1;
    await redisClient.hmsetAsync(roulette,currentRoulette);
    let newCurrentRoulette = await redisClient.hgetAllAsync(roulette);
    if(newCurrentRoulette.status) {
        res.success=true;
        res.message="Roulette open correctly"
    }
    else {
        res.success=false;
        res.message="Roulette not open correctly"
    }
    return res.json(res.message);
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