var Session = require('express-session');
var RedisStore = require('connect-redis')(Session);
var client = require('../io/redis');

module.exports = new RedisStore({
  client: client
});