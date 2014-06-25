var Session = require('express-session');
var RedisStore = require('connect-redis')(Session);

module.exports = new RedisStore({});