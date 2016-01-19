'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var Room = require('../../../../../shared/models/room');
var roomEmitter = require('../../../util/room-emitter');
var unsubscriber = require('../../../util/unsubscriber');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var disallowUser = session.__user__;
  var user = session.__currentUser__;
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

      if (!disallowUser) {
        return callback('user-not-found');
      }

      if (!room.isOwner(user.id) && session.settings.admin !== true) {
        return callback('not-admin-owner');
      }

      if (room.isOwner(disallowUser)) {
        return callback('owner');
      }

      if (!room.isAllowed(disallowUser.id)) {
        return callback('not-allowed');
      }

      return callback(null);
    },

    function persistOnRoom (callback) {
      Room.update({_id: { $in: [room.id] }},
        {
          $pull: {
            users: disallowUser.id,
            op: disallowUser.id,
            allowed: disallowUser.id,
            devoices: {user: disallowUser._id},
            allowed_pending: {user: disallowUser._id}
          }
        }, function (err) {
          return callback(err);
        }
      );
    },

    function persistOnUser (callback) {
      if (!room.isIn(disallowUser.id)) {
        return callback(null);
      }

      disallowUser.addBlockedRoom(room.id, 'ban', null, function (err) {
        return callback(err);
      });
    },

    function unsubscribeClients (callback) {
      unsubscriber(that.app, disallowUser.id, room.id, callback);
    },

    function broadcastToUser (callback) {
      that.app.globalChannelService.pushMessage('connector', 'room:blocked', {room_id: room.id, why: 'disallow'}, 'user:' + disallowUser.id, {}, function (err) {
        return callback(err);
      });
    },

    function broadcastToRoom (callback) {
      var event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: disallowUser.id,
        username: disallowUser.username,
        avatar: disallowUser._avatar()
      };

      roomEmitter(that.app, user, room, 'room:kick', event, callback);
    }

    // @todo: notification ? (be careful with noisy notifications)

  ], function (err) {
    if (err) {
      return errors.getHandler('room:disallow', next)(err);
    }

    return next(null, {success: true});
  });
};
