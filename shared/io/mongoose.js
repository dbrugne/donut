'use strict';
var logger = require('../util/logger').getLogger('donut', __filename);
var _mongoose;

module.exports = function (uri) {
  if (!_mongoose) {
    _mongoose = require('mongoose');

    if (!uri) {
      var conf = require('../../config/index');
      uri = conf.mongodb.uri;
    }

    // @doc: http://mongoosejs.com/docs/connections.html
    _mongoose.connect(uri, {
      server: {
        socketOptions: {
          keepAlive: 120
        }
      },
      replset: {
        socketOptions: {
          keepAlive: 120
        }
      }
    });

    _mongoose.connection.on('open', function () {
      logger.debug('Connection to MongoDB established');
    });

    _mongoose.connection.on('disconnected', function () {
      logger.debug('Connection to MongoDB lost');
    });

    _mongoose.connection.on('error', function (err) {
      logger.error('Error in MongoDB query: ' + err);
    });
  }

  return _mongoose;
};
