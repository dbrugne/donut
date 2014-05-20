var conf = require('./config.global');

conf.title = 'c!';
conf.mongo.url = 'mongodb://localhost:27017/chat';

module.exports = conf;