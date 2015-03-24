var conf = require('./config.global');

conf.url = 'https://test.donut.me';
conf.fqdn = 'test.donut.me';
conf.less.force = true;
conf.mongo.url = 'mongodb://localhost:27017/donut';
conf.facebook.clientID = '400694556754416';
conf.facebook.clientSecret = '0ae02262f9a318add8b50378eaaf42ce';
conf.facebook.callbackURL = 'https://test.donut.me/login/facebook/callback';
conf.google.analytics.uid = 'UA-51674523-1';

module.exports = conf;
