var conf = require('./config.global.js');

conf.url = 'https://donut.local';
conf.fqdn = 'donut.local';
conf.less.force = true;
conf.mongo.url = 'mongodb://localhost:27017/donut';
conf.facebook.callbackURL = 'https://donut.local/login/facebook/callback';
conf.google.analytics.uid = 'UA-51674523-1';
conf.notifications.delay = 10; // in seconds
conf.notifications.types.usermessage.creation = 30; // in seconds
conf.notifications.types.roomjoin.creation = 30; // in seconds

module.exports = conf;