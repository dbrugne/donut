var env = process.env.NODE_ENV || 'development'
  , conf = require('./config.'+env);

console.log('Assuming ./config.'+env+'.js for configuration');
module.exports = conf;