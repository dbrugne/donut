'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var roomEmitter = require('../../../util/roomEmitter');
var inputUtil = require('../../../util/input');
var Notifications = require('../../../components/notifications');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var devoicedUser = session.__user__;
  var room = session.__room__;

  var that = this;

  var reason = (data.reason) ? inputUtil.filter(data.reason, 512) : false;

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

      if (!devoicedUser) {
        return callback('user-not-found');
      }

      if (room.isOwner(devoicedUser.id)) {
        return callback('owner');
      }

      if (room.isDevoice(devoicedUser.id)) {
        return callback('devoiced');
      }

      if (!room.isIn(devoicedUser.id)) {
        return callback('no-in');
      }

      return callback(null);
    },

    function persist (callback) {
      var devoice = {
        user: devoicedUser._id,
        devoiced_at: new Date()
      };
      if (reason !== false) {
        devoice.reason = reason;
      }

      room.update({$addToSet: { devoices: devoice }}, function (err) {
        return callback(err);
      });
    },

    function broadcast (callback) {
      var event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: devoicedUser.id,
        username: devoicedUser.username,
        avatar: devoicedUser._avatar()
      };
      if (reason !== false) {
        event.reason = reason;
      }

      roomEmitter(that.app, user, room, 'room:devoice', event, callback);
    },

    function notification (sentEvent, callback) {
      Notifications(that.app).getType('roomdevoice').create(devoicedUser, room, sentEvent.id, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:devoice', next)(err);
    }

    next(null, { success: true });
  });
};
