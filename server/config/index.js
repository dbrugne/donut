var env = process.env.NODE_ENV || 'dev'
  , conf = require('./config.'+env);

console.log('Assuming ./config.'+env+'.js for configuration');
module.exports = conf;