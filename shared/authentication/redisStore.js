var conf = require('../config/index');
var Session = require('express-session');
var RedisStore = require('connect-redis')(Session);
var client = require('../io/redis');

module.exports = new RedisStore({
  client: client,
  ttl: conf.sessions.ttl * 2 // 2 week (x2 cookie maxAge)
});