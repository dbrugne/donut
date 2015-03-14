var conf = require('./config.global');

conf.url = 'https://donut.me';
conf.fqdn = 'donut.me';
conf.mongo.url = 'mongodb://localhost:27017/donut';
conf.facebook.clientID = '328569463966926';
conf.facebook.clientSecret = 'e496a32d53acc5d7b855051fd15eb754';
conf.facebook.callbackURL = 'http://donut.me/login/facebook/callback';
conf.google.analytics.uid = 'UA-51674523-2';
conf.sessions.key = 'donut-pomelo.sid';

module.exports = conf;
