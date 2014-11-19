var debug = require('debug')('donut:server:mongoose');
var mongoose = require('mongoose');
var conf = require('../config/index');

mongoose.connect(conf.mongo.url);

mongoose.connection.on('open', function() {
  debug('Connection to MongoDB established');
});

mongoose.connection.on('disconnected', function() {
  debug('Connection to MongoDB lost');
});

mongoose.connection.on('error', function(err) {
  debug('Error in MongoDB query: '+err);
});

module.exports = mongoose;