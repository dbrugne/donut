'use strict';
var _ = require('underscore');
var async = require('async');
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

  var model;

  async.series([

    function (fn) {
      recorder(room, eventName, eventData, function (err, _model) {
        if (err) {
          return fn('Error while emitting room event ' + eventName + ' in ' + room.name + ': ' + err);
        }

        model = _model;

        // add model id on broadcasted event
        eventData.id = model.id;

        // @hack
        // files
        if (eventData.files && eventData.files.length > 0) {
          eventData.files = _.map(eventData.files, function (element, key, value) {
            // @important: use .path to obtain URL with file extension and avoid
            // CORS errors
            return cloudinary.messageFile(element);
          });
        }

        fn(null);
      });
    },

    function (fn) {
      app.globalChannelService.pushMessage('connector', eventName, eventData, room.id, {}, fn);
    },

    function (fn) {
      room.last_event_at = Date.now();
      room.last_event = model._id;
      room.save(function (err) {
        return fn(err);
      });
    },

    function (fn) {
      if (!room.group) {
        return fn(null);
      }

      room.group.last_event_at = Date.now();
      room.group.last_event = model._id;
      room.group.save(function (err) {
        return fn(err);
      });
    },

    function (fn) {
      // set unviewed flag on users
      UserModel.setUnviewedRoomMessage(room._id, room.users, user._id, model._id, function (err) {
        return fn(err, eventData);
      });
    }

  ], function (err) {
    return callback(err, eventData);
  });
};
