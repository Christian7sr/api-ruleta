const redis = require('redis');
const {promisify} = require('util');

const client = redis.createClient({host: 'redis_db1'});


client.on("connect", function(error){
  console.log("Redis connection established", error);
})

client.on("error", function(error){
  console.error("Error encountered", error);
})

module.exports = {
  ...client,
  getAsync: promisify(client.get).bind(client),
  setAsync: promisify(client.set).bind(client),
  lpushAsync: promisify(client.lpush).bind(client),
  rpushAsync: promisify(client.rpush).bind(client),
  lrangeAsync: promisify(client.lrange).bind(client),
  hmsetAsync: promisify(client.hmset).bind(client),
  hgetAsync: promisify(client.hget).bind(client),
  hgetAllAsync: promisify(client.hgetall).bind(client),
  keysAsync: promisify(client.keys).bind(client)
};