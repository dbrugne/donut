var conf = require('./config.global');

conf.title = conf.title + ' (dev)';
conf.mongo.url = 'mongodb://localhost:27017/chat';
conf.facebook.callbackURL = 'http://chat.local:3000/login/facebook/callback';

module.exports = conf;