'use strict';

var _ = require('underscore');
var redisClient = require('./redis');

/**
 * Abstract Pomelo infrastructure
 */

module.exports = {
  usersStatus: function (userIds, callback) {
    if (!userIds || !userIds.length) {
      return callback(null, []);
    }

    var commands = _.map(userIds, function (userId) {
      return ['exists', 'pomelo:status:' + userId];
    });

    redisClient.multi(commands).exec(callback);
  }
};
