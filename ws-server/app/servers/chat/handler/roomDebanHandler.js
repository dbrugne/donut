'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
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

    function persist (callback) {
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
      bannedUser.update({
        $pull: {blocked: room.id}
      }, function (err) {
        return callback(err);
      }
      );
    },

    function broadcast (callback) {
      event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: bannedUser.id,
        username: bannedUser.username,
        avatar: bannedUser._avatar()
      };

      roomEmitter(that.app, user, room, 'room:deban', event, callback);
    },

    function broadcastToBannedUser (sentEvent, callback) {
      that.app.globalChannelService.pushMessage('connector', 'room:deban', event, 'user:' + bannedUser.id, {}, function (reponse) {
        callback(null, sentEvent);
      });
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
