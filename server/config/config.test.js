var conf = require('./config.global');

conf.fqdn = 'test.donut.me';
conf.less.force = true;
conf.mongo.url = 'mongodb://localhost:27017/donut';
conf.facebook.callbackURL = 'http://chat.local:3000/login/facebook/callback';
conf.google.analytics.uid = 'UA-51674523-1';

module.exports = conf;
