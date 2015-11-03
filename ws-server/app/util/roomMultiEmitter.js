'use strict';
var logger = require('../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var _ = require('underscore');
var async = require('async');

/**
 * Store history in MongoDB, emit event in corresponding room and call callback
 *
 * @param rooms [{id: String, name: String}]
 * @param eventName
 * @param eventData
 * @param callback
 */
module.exports = function (app, rooms, eventName, eventData, callback) {
  if (!Array.isArray(rooms)) {
    return callback("roomMultiEmitter need to received an array as 'rooms' parameter");
  }

  var parallels = [];
  _.each(rooms, function (room) {
    if (!room) {
      return logger.error('roomMultiEmitter room parameter is mandatory');
    }

    parallels.push(function (fn) {
      var data = _.clone(eventData); // avoid modification on the object
                                     // reference
      // always add room name and time to event
      data.name = room.name;
      data.room_id = room.id;
      data.room_name = room.name;
      data.time = Date.now();

      // emit event to room users
      data.id = Date.now() + room.id + data.user_id;
      app.globalChannelService.pushMessage('connector', eventName, data, room.id, {}, function (err) {
        if (err) {
          return logger.error('Error while pushing message: ' + err);
        }

        return fn(null);
      });
    });
  });

  // run tasks
  async.parallel(parallels, function (err) {
    return callback(err);
  });
};
