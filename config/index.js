'use strict';
var env = process.env.NODE_ENV || 'development';
var conf = require('./config.' + env);

console.log('assuming ./config.' + env + '.js for configuration');

if (conf.fqdn === '') {
  throw new Error('fqdn key should be filled in configuration');
}

module.exports = conf;
