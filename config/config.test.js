'use strict';
var conf = require('./config.global.js');

conf.url = 'https://test.donut.me';
conf.fqdn = 'test.donut.me';
conf.less.force = true;
conf.mongo.url = 'mongodb://localhost:27017/donut';
conf.facebook.callbackURL = 'https://test.donut.me/login/facebook/callback';
conf.google.analytics.uid = 'UA-51674523-1';
conf.notifications.types.usermessage.creation = 10; // in seconds
conf.notifications.types.roommessage.creation = 10; // in seconds
conf.notifications.types.roomjoin.creation = 10; // in seconds

module.exports = conf;
