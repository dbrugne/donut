'use strict';
var _ = require('underscore');
var recorder = require('../../../shared/models/historyroom').record();
var UserModel = require('../../../shared/models/user');
var cloudinary = require('../../../shared/util/cloudinary');

/**
 * Store history in MongoDB, emit event in corresponding room and call:
 *
 *   callback(err, sentEvent)
 *
 * @param app
 * @param user
 * @param room
 * @param eventName
 * @param eventData
 * @param callback
 */
module.exports = function (app, user, room, eventName, eventData, callback) {
  if (!room) {
    return callback('roomEmitter require room parameter');
  }
  if (!user) {
    return callback('roomEmitter require user parameter');
  }

  eventData.time = new Date();
  eventData.name = room.name;
  eventData.room_name = room.name;
  eventData.room_id = room.id;
  eventData.room_mode = room.mode;

  recorder(room, eventName, eventData, function (err, model) {
    if (err) {
      return callback('Error while emitting room event ' + eventName + ' in ' + room.name + ': ' + err);
    }

    eventData.id = model.id;

    // @hack
    // images
    if (eventData.images && eventData.images.length > 0) {
      eventData.images = _.map(eventData.images, function (element, key, value) {
        // @important: use .path to obtain URL with file extension and avoid
        // CORS errors
        return cloudinary.messageFile(element);
      });
    }

    app.globalChannelService.pushMessage('connector', eventName, eventData, room.name, {}, function (err) {
      if (err) {
        return callback('Error while pushing message: ' + err);
      }

      if ([ 'room:message', 'room:topic' ].indexOf(eventName) === -1) {
        return callback(null, eventData);
      }

      // set unviewed flag on users
      UserModel.setUnviewedRoomMessage(room._id, room.users, user._id, model._id, function (err) {
        callback(err, eventData);
      });
    });
  });
};
