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
    if(currentRoulette!=undefined){
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
    }else{
        res.success=false;
        res.message="Roulette not exist"
    }
    return res.json(res.message);
});
app.get('/aRoulette', async function (req, res) {
    let roulette = req.body.id;
    let response = await getRoullete(roulette);
    if(response.success){
        return res.json(response.roulette);
    }else{
        return res.json(response.message);
    }
});
app.post('/rouletteBet', async function (req, res) {
    let rouletteID = req.body.idRoulette, number = req.body.number, color = req.body.color, money = req.body.money;
    let userCredentials= req.headers;
    //checking the user credentials
    //checking that the user have enough money for the bet
    let response = await getRoullete(rouletteID);
    if(response.success){
        if(money<=10000 && money>0){
            if(number!=undefined){
                if(number>=0 && number<=36){
                    let betuuid = uuidv4();
                    let nameBet="bet#"+betuuid;
                    try {
                        await redisClient.hmsetAsync(nameBet,{
                            'id': betuuid,
                            'type': 'number',
                            'value': number,
                            'rouletteID': rouletteID,
                            'money': money
                        });
                        return res.json("Bet placed correctly");
                    } catch (error) {
                        console.log(error);
                        return res.json(error);
                    }
                }else{
                    return res.json("Bet number is not valid , insert a number between 0-36")
                }
            }else{
                if(color=="black" || color=="red"){
                    let betuuid = uuidv4();
                    let nameBet="bet#"+betuuid;
                    try {
                        await redisClient.hmsetAsync(nameBet,{
                            'id': betuuid,
                            'type': 'color',
                            'value': color,
                            'rouletteID': rouletteID,
                            'money': money
                        });
                        return res.json("Bet placed correctly");
                    } catch (error) {
                        console.log(error);
                        return res.json(error);
                    }
                }else{
                    return res.json("Bet color is not valid , choose a color between red or black")
                }
            }
        }else{
            return res.json("the bet can be for more than 10000 USD or less than cero")
        }
    }else{
        return res.json(response.message)
    }
});
app.post('/rouletteState', async function (req, res) {
    let roulette = req.body.id;
    let state= await redisClient.getAsync(roulette);
    if(state) res.success=true;
    else res.success=false;
    return res.success;
});


app.post('/rouletteClose', async function (req, res) {
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
async function getRoullete(id){
    let roulette='roulette#'+id;
    let currentRoulette = await redisClient.hgetAllAsync(roulette);
    let res = new Object();
    if(currentRoulette!=undefined){
        res.roulette = currentRoulette;
        res.success=true
        res.message="Roulette exist"
        return res;
    }else{
        res.success=false
        res.message="Roulette does not exist"
        return res;
    }
};