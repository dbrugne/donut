var debug = require('debug')('shared:config');
var env = process.env.NODE_ENV || 'development'
  , conf = require('./config.'+env);

debug('Assuming ./config.'+env+'.js for configuration');
module.exports = conf;