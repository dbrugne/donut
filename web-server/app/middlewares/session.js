'use strict';
var conf = require('../../../config/index');
var session = require('express-session');
var redisStore = require('../../../shared/authentication/redisStore');

module.exports = session({
  store: redisStore,
  secret: conf.sessions.secret,
  key: conf.sessions.key,
  resave: true,
  saveUninitialized: true,
  cookie: {
    domain: conf.fqdn, // work for root domain and subdomains (e.g.: ws.)
    maxAge: conf.sessions.ttl * 1000 // 1 week
  }
});
