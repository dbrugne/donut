var env = process.env.NODE_ENV || 'dev'
  , conf = require('./config.'+env);

module.exports = conf;