var conf = require('./config.global.js');

conf.url = 'https://donut.local';
conf.fqdn = 'donut.local';
conf.less.force = true;
conf.mongo.url = 'mongodb://localhost:27017/donut';
conf.facebook.callbackURL = 'https://donut.local:3000/login/facebook/callback';
conf.google.analytics.uid = 'UA-51674523-1';

module.exports = conf;