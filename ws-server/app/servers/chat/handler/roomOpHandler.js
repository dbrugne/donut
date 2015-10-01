'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var Notifications = require('../../../components/notifications');
var roomEmitter = require('../../../util/roomEmitter');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var opedUser = session.__user__;
  var room = session.__room__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('params-room-id');
      }

      if (!data.user_id && !data.username) {
        return callback('params-username-user-id');
      }

      if (!room) {
        return callback('room-not-found');
      }

      if (!room.isOwnerOrOp(user.id) && session.settings.admin !== true) {
        return callback('no-op-owner-admin');
      }

      if (!opedUser) {
        return callback('user-not-found');
      }

      if (!room.isIn(opedUser.id)) {
        return callback('no-in');
      }

      if (room.isOwner(opedUser.id)) {
        return callback('owner');
      }

      if (room.isOp(opedUser.id)) {
        return callback('oped');
      }

      return callback(null);
    },

    function persist (callback) {
      room.update({$addToSet: { op: opedUser._id }}, function (err) {
        return callback(err);
      });
    },

    function broadcast (callback) {
      var event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: opedUser.id,
        username: opedUser.username,
        avatar: opedUser._avatar()
      };

      roomEmitter(that.app, user, room, 'room:op', event, callback);
    },

    function notification (sentEvent, callback) {
      Notifications(that.app).getType('roomop').create(opedUser, room, sentEvent.id, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:op', next)(err);
    }

    next(null, {});
  });
};
