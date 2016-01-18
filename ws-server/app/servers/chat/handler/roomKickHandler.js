'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var Notifications = require('../../../components/notifications');
var roomEmitter = require('../../../util/room-emitter');
var inputUtil = require('../../../util/input');
var unsubscriber = require('../../../util/unsubscriber');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var kickedUser = session.__user__;
  var room = session.__room__;

  var that = this;

  var reason = (data.reason) ? inputUtil.filter(data.reason, 512) : '';

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
        return callback('not-op-owner-admin');
      }

      if (!kickedUser) {
        return callback('user-not-found');
      }

      if (room.isOwner(kickedUser.id)) {
        return callback('owner');
      }

      if (!room.isIn(kickedUser.id)) {
        return callback('not-in');
      }

      return callback(null);
    },

    function persistOnRoom (callback) {
      room.update({$pull: {
        users: kickedUser.id
      }}, function (err) {
        return callback(err);
      });
    },

    function persistOnUser (callback) {
      if (!room.isIn(kickedUser.id)) {
        return callback(null);
      }
      kickedUser.addBlockedRoom(room.id, 'kick', reason, function (err) {
        return callback(err);
      });
    },

    function unsubscribeClients (callback) {
      unsubscriber(that.app, kickedUser.id, room.id, callback);
    },

    function broadcastToUser (callback) {
      that.app.globalChannelService.pushMessage('connector', 'room:blocked', {room_id: room.id, why: 'kick', reason: reason}, 'user:' + kickedUser.id, {}, function (err) {
        return callback(err);
      });
    },

    function broadcastToRoom (callback) {
      var event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: kickedUser.id,
        username: kickedUser.username,
        avatar: kickedUser._avatar(),
        reason: reason
      };

      roomEmitter(that.app, user, room, 'room:kick', event, callback);
    },

    function notification (sentEvent, callback) {
      Notifications(that.app).getType('roomkick').create(kickedUser, room, sentEvent.id, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:kick', next)(err);
    }

    next(null, {});
  });
};
