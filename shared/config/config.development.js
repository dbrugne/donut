var conf = require('./config.global.js');

conf.fqdn = 'donut.local';
conf.less.force = true;
conf.mongo.url = 'mongodb://localhost:27017/donut';
conf.facebook.callbackURL = 'http://donut.local:3000/login/facebook/callback';
conf.google.analytics.uid = 'UA-51674523-1';
conf.email.port = 1025; // MockSmtp

module.exports = conf;