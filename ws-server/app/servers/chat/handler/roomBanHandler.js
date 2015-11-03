'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
var Notifications = require('../../../components/notifications');
var roomEmitter = require('../../../util/roomEmitter');
var inputUtil = require('../../../util/input');

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
        banned_at: new Date()
      };
      if (reason) {
        ban.reason = reason;
      }

      room.update({
        $addToSet: {bans: ban},
        $pull: {users: bannedUser._id, op: bannedUser._id, allowed: bannedUser._id}
      }, function (err) {
        return callback(err, ban);
      });
    },

    function persistOnUser (banEvent, callback) {
      bannedUser.update({
        $addToSet: {blocked: room.id}
      }, function (err) {
        return callback(err, banEvent);
      });
    },

    function broadcast (banEvent, callback) {
      event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: bannedUser.id,
        username: bannedUser.username,
        avatar: bannedUser._avatar(),
        banned_at: banEvent.banned_at
      };

      if (reason) {
        event.reason = reason;
      }

      roomEmitter(that.app, user, room, 'room:ban', event, callback);
    },

    function broadcastToBannedUser (sentEvent, callback) {
      that.app.globalChannelService.pushMessage('connector', 'room:ban', event, 'user:' + bannedUser.id, {}, function (reponse) {
        callback(null, sentEvent);
      });
    },

    function unsubscribeClients (event, callback) {
      // /!\ .unsubscribeClients come after .historizeAndEmit to allow banned
      // user to receive message

      // search for all the user sessions (any frontends)
      that.app.statusService.getSidsByUid(bannedUser.id, function (err, sids) {
        if (err) {
          return callback('Error while retrieving user status: ' + err);
        }

        if (!sids || sids.length < 1) {
          return callback(null, event); // the targeted user could be offline
                                        // at this time
        }

        var parallels = [];
        _.each(sids, function (sid) {
          parallels.push(function (fn) {
            that.app.globalChannelService.leave(room.id, bannedUser.id, sid, function (err) {
              if (err) {
                return fn(sid + ': ' + err);
              }

              return fn(null);
            });
          });
        });
        async.parallel(parallels, function (err, results) {
          if (err) {
            return callback('Error while unsubscribing user ' + bannedUser.id + ' from ' + room.name + ': ' + err);
          }

          return callback(null, event);
        });
      });
    },

    function notification (event, callback) {
      Notifications(that.app).getType('roomban').create(bannedUser, room, event.id, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:ban', next)(err);
    }

    next(null, {});
  });
};
