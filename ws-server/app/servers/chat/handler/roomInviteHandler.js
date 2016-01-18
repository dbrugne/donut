'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var Room = require('../../../../../shared/models/room');
var Notifications = require('../../../components/notifications');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__user__;
  var currentUser = session.__currentUser__;
  var room = session.__room__;

  var that = this;

  var event = {};

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('params-room-id');
      }

      if (!data.user_id) {
        return callback('params-user-id');
      }

      if (!room) {
        return callback('room-not-found');
      }

      if (!room.isOwnerOrOp(currentUser.id) && session.settings.admin !== true) {
        return callback('not-admin-owner');
      }

      if (room.isAllowed(user.id)) {
        return callback('already-allowed');
      }

      if (room.isBanned(user.id)) {
        return callback('banned');
      }

      if (room.isAllowedPending(user.id)) {
        return callback('allow-pending');
      }

      return callback(null);
    },

    function createEvent (callback) {
      event = {
        by_user_id: currentUser._id,
        by_username: currentUser.username,
        by_avatar: currentUser._avatar(),
        user_id: user._id,
        username: user.username,
        avatar: user._avatar(),
        room_id: room.id,
        identifier: room.getIdentifier()
      };
      callback(null, event);
    },

    function broadcastToUser (eventData, callback) {
      that.app.globalChannelService.pushMessage('connector', 'room:allow', event, 'user:' + user.id, {}, function (reponse) {
        callback(null, eventData);
      });
    },

    function persist (eventData, callback) {
      Room.update(
        {_id: { $in: [room.id] }},
        {$addToSet: {allowed: user.id}}, function (err) {
          return callback(err, eventData);
        });
    },

    function persistOnUser (eventData, callback) {
      user.update({$pull: {blocked: room.id}}, function (err) {
        return callback(err, eventData);
      });
    },

    function notification (event, callback) {
      Notifications(that.app).getType('roominvite').create(user.id, room, event, function (err) {
        return callback(err, event);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:invite', next)(err);
    }

    return next(null);
  });
};
