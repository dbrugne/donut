'use strict';
var logger = require('../util/logger').getLogger('mongoose', __filename);
var mongoose = require('mongoose');
var conf = require('../../config/index');

mongoose.connect(conf.mongo.url);

mongoose.connection.on('open', function () {
  logger.debug('Connection to MongoDB established');
});

mongoose.connection.on('disconnected', function () {
  logger.debug('Connection to MongoDB lost');
});

mongoose.connection.on('error', function (err) {
  logger.error('Error in MongoDB query: ' + err);
});

module.exports = mongoose;
