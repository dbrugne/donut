var conf = require('../../config/index');
var session = require('express-session');
var redisStore = require('../redissessions');
// @todo : allowing cookies for subdomains (adding domain to cookie{}) : http://stackoverflow.com/questions/11850977/sessions-across-subdomains-in-express

module.exports = session({
  store             : redisStore,
  secret            : conf.sessions.secret,
  key               : conf.sessions.key,
  resave            : true,
  saveUninitialized : true,
  cookie: {
    maxAge          : 7*24*3600*1000 // 1 week
  }
});