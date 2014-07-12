var Session = require('express-session');
var RedisStore = require('connect-redis')(Session);
var client = require('./redis');

module.exports = new RedisStore({
  client: client
});