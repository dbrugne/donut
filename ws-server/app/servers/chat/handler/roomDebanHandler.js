'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
var Notifications = require('../../../components/notifications');
var roomEmitter = require('../../../util/room-emitter');
var UserModel = require('../../../../../shared/models/user');

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

  var event = {};

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

      return callback(null);
    },

    function persistOnRoom (callback) {
      if (!room.bans || !room.bans.length) {
        return callback('not-banned');
      }

      if (!room.isBanned(bannedUser.id)) {
        return callback('not-banned');
      }

      var subDocument = _.find(room.bans, function (ban) {
        if (ban.user.toString() === bannedUser.id) {
          return true;
        }
      });
      room.bans.id(subDocument._id).remove();
      room.save(function (err) {
        return callback(err);
      });
    },

    function persistOnUser (callback) {
      // if user no more banned but still can't join (private room)
      if (room.isUserBlocked(bannedUser.id) !== false) {
        UserModel.update({_id: bannedUser.id, 'blocked.room': room.id},
          {$set: {'blocked.$.why': 'disallow'}})
          .exec(function (err) {
            return callback(err);
          });
      } else {
        bannedUser.removeBlockedRoom(room.id, function (err) {
          return callback(err);
        });
      }
    },

    function broadcastToBannedUser (callback) {
      if (room.isUserBlocked(bannedUser.id) !== false) {
        return callback(null);
      }
      that.app.globalChannelService.pushMessage('connector', 'room:unblocked', {room_id: room.id}, 'user:' + bannedUser.id, {}, function (err) {
        return callback(err);
      });
    },

    function broadcast (callback) {
      event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: bannedUser.id,
        username: bannedUser.username,
        avatar: bannedUser._avatar(),
        identifier: room.getIdentifier()
      };

      roomEmitter(that.app, user, room, 'room:deban', event, callback);
    },

    function notification (event, callback) {
      Notifications(that.app).getType('roomdeban').create(bannedUser, room, event.id, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:deban', next)(err);
    }

    next(null, {});
  });
};
