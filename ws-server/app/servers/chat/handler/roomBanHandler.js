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
  var bannedUser = session.__user__;
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

      if (!bannedUser) {
        return callback('user-not-found');
      }

      if (room.isOwner(bannedUser.id)) {
        return callback('owner');
      }

      if (room.isBanned(bannedUser.id)) {
        return callback('banned');
      }

      return callback(null);
    },

    function persistOnRoom (callback) {
      var ban = {
        user: bannedUser._id,
        banned_at: new Date(),
        reason: reason
      };
      room.update({
        $addToSet: {bans: ban},
        $pull: {
          users: bannedUser._id,
          op: bannedUser._id,
          allowed: bannedUser._id,
          devoices: {user: bannedUser._id},
          allowed_pending: {user: bannedUser._id}
        }
      }, function (err) {
        return callback(err);
      });
    },

    function persistOnUser (callback) {
      if (!room.isIn(bannedUser.id)) {
        return callback(null);
      }
      bannedUser.addBlockedRoom(room.id, 'ban', reason, function (err) {
        return callback(err);
      });
    },

    function unsubscribeClients (callback) {
      unsubscriber(that.app, bannedUser.id, room.id, callback);
    },

    function broadcastToUser (callback) {
      // @todo optimise by allowing room:blocked with room_ids array of _id to block
      that.app.globalChannelService.pushMessage('connector', 'room:blocked', {room_id: room.id, why: 'ban', reason: reason}, 'user:' + bannedUser.id, {}, function (err) {
        return callback(err);
      });
    },

    function broadcastToRoom (callback) {
      var event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: bannedUser.id,
        username: bannedUser.username,
        avatar: bannedUser._avatar(),
        reason: reason
      };

      roomEmitter(that.app, user, room, 'room:ban', event, callback);
    },

    function notification (sentEvent, callback) {
      Notifications(that.app).getType('roomban').create(bannedUser, room, sentEvent.id, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:ban', next)(err);
    }

    next(null, {});
  });
};
