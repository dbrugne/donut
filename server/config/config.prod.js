var conf = require('./config.global');

conf.mongo.url = 'mongodb://localhost:27017/chat';
conf.facebook.callbackURL = 'http://www.chatworldcup.com/login/facebook/callback';

module.exports = conf;