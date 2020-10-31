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
    let response = await openCloseRoullette(req.body.id,1);
    
    return res.json(response.message);
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
        if(response.roulette.status==1){
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
                return res.json("the bet can't be for more than 10000 USD or less than cero")
            }
        }else{
            return res.json("This roulette is not open yet")
        }
    }else{
        return res.json(response.message)
    }
});

app.post('/rouletteClose', async function (req, res) {
    let rouletteID = req.body.id;
    let response = await getRoullete(rouletteID);
    if(response.success){
        let close = await openCloseRoullette(response.roulette.id,0);
        if(close.success){
            return res.json(close.result);
        }else{
            return res.json(close.message);
        }
    }else{
        return res.json(response.message)
    }
});

app.get('/allRoulettes', async function(req, res){
    const allIds= await redisClient.lrangeAsync('allroulettes', 0, -1);
    for(let i = 0, len = allIds.length; i < len; i++) {
        let roulette = await getRoullete(allIds[i]);
        allIds[i]=roulette.roulette
    }
    return res.json(allIds);
});

app.listen(PORT, ()=> {
    console.log('Server successfully started');
});

async function openCloseRoullette(id, openOrClose){
    let response = await getRoullete(id), resp = new Object();
    if(response.success){
        if(response.roulette.status==1 && openOrClose==1){
            resp.message = "This roulette was already open"
            resp.success=false
        }else if(response.roulette.status==1 && openOrClose==0){
            response.roulette.status=0
            let success = await redisClient.hmsetAsync('roulette#'+response.roulette.id,response.roulette);
            if(success=="OK"){
                let betsF = new Array();
                let randomNumber = Math.round(Math.random()*36);
                let bets = await redisClient.keysAsync('bet#*');
                for(let i = 0, len = bets.length; i < len; i++) {
                    let bet = await redisClient.hgetAllAsync(bets[i]);
                    bets[i]=bet;
                    if(bets[i].rouletteID==response.roulette.id){
                        betsF.push(bets[i])
                    }
                }
                for(let i = 0, len = betsF.length; i < len; i++) {
                    if(betsF[i].type=='number'){
                        if(parseInt(betsF[i].value)==randomNumber){
                            betsF[i].result="WIN"
                            let newMoney = parseInt(betsF[i].money)*5;
                            betsF[i].earnedMoney=newMoney;
                            betsF[i].lostMoney=0;
                        }else{
                            betsF[i].result="LOSE"
                            betsF[i].earnedMoney=0;
                            betsF[i].lostMoney=betsF[i].money;
                        }
                    }else if(betsF[i].type=='color'){
                        let color=""
                        if(randomNumber%2==0){
                            color="red"
                        }else color="black"
                        if(betsF[i].value==color){
                            betsF[i].result="WIN"
                            let newMoney = parseInt(betsF[i].money)*1.8;
                            betsF[i].earnedMoney=newMoney;
                            betsF[i].lostMoney=0;
                        }else{
                            betsF[i].result="LOSE"
                            betsF[i].earnedMoney=0;
                            betsF[i].lostMoney=betsF[i].money;
                        }
                    }
                    redisClient.delAsync('bet#'+betsF[i].id);
                }
                resp.result=betsF
                resp.success=true
                resp.message="Roulette close correctly"
            }else{
                resp.success=false
                resp.message="Roulette do not close correctly"
            }
        }else if(response.roulette.status==0 && openOrClose==1){
            response.roulette.status=1
            await redisClient.hmsetAsync('roulette#'+response.roulette.id,response.roulette);
            resp.success=true
            resp.message="Roulette open correctly"
        }else if(response.roulette.status==0 && openOrClose==0){
            resp.message = "This roulette was already close"
            response.success=false
        }
        return resp
    }else{
        return resp
    }
};

async function getRoullete(id){
    let roulette='roulette#'+id;
    let currentRoulette = await redisClient.hgetAllAsync(roulette);
    let res = new Object();
    if(currentRoulette!=undefined){
        res.roulette = currentRoulette;
        res.success=true
        res.message="Roulette exist"
    }else{
        res.success=false
        res.message="Roulette does not exist"
    }
    return res;
};