'use strict';
var conf = require('../../../config/index');
var session = require('express-session');

var RedisStore = require('connect-redis')(session);
var client = require('../io/redis');
var store = new RedisStore({
  client: client,
  ttl: conf.sessions.ttl * 2 // 2 week (x2 cookie maxAge)
});

module.exports = session({
  store: store,
  secret: conf.sessions.secret,
  key: conf.sessions.key,
  resave: true,
  saveUninitialized: true,
  cookie: {
    domain: conf.fqdn, // work for root domain and subdomains (e.g.: ws.)
    maxAge: conf.sessions.ttl * 1000 // 1 week
  }
});
