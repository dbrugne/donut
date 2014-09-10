var conf = require('../../config/index');
var session = require('express-session');
var redisStore = require('../redissessions');

module.exports = session({
  store             : redisStore,
  secret            : conf.sessions.secret,
  key               : conf.sessions.key,
  resave            : true,
  saveUninitialized : true
});