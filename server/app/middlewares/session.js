var conf = require('../../config/index');
var Session = require('express-session');
var redisStore = require('../redissessions');

module.exports = Session({
  store   : redisStore,
  secret  : conf.sessions.secret,
  key     : conf.sessions.key
});