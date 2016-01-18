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

    function persistOnRoom (callback) {
      Room.update(
        {_id: { $in: [room.id] }},
        {$addToSet: {allowed: user.id}}, function (err) {
          return callback(err);
        });
    },

    function persistOnUser (callback) {
      user.removeBlockedRoom(room.id, function (err) {
        return callback(err);
      });
    },

    function broadcastToUser (callback) {
      that.app.globalChannelService.pushMessage('connector', 'room:unblocked', {room_id: room.id}, 'user:' + user.id, {}, function (err) {
        callback(err);
      });
    },

    function notification (callback) {
      var event = {
        by_user_id: currentUser._id,
        by_username: currentUser.username,
        by_avatar: currentUser._avatar(),
        user_id: user._id,
        username: user.username,
        avatar: user._avatar(),
        room_id: room.id,
        identifier: room.getIdentifier()
      };
      Notifications(that.app).getType('roominvite').create(user.id, room, event, function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:invite', next)(err);
    }

    return next(null);
  });
};
