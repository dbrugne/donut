var conf = require('./config.global');

conf.fqdn = 'donut.me';
conf.mongo.url = 'mongodb://localhost:27017/chat';
conf.facebook.clientID = '328569463966926';
conf.facebook.clientSecret = 'e496a32d53acc5d7b855051fd15eb754';
conf.facebook.callbackURL = 'http://donut.me/login/facebook/callback';
conf.google.analytics.uid = 'UA-51674523-2';

module.exports = conf;