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
  var kickedUser = session.__user__;
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

    function persist (callback) {
      room.update({$pull: { users: kickedUser.id }}, function (err) {
        return callback(err);
      });
    },

    function persistOnUser (callback) {
      kickedUser.update({
        $addToSet: {blocked: room.id}
      }, function (err) {
        return callback(err);
      });
    },

    function broadcast (callback) {
      event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: kickedUser.id,
        username: kickedUser.username,
        avatar: kickedUser._avatar()
      };

      if (data.reason) {
        event.reason = data.reason;
      }

      roomEmitter(that.app, user, room, 'room:kick', event, callback);
    },

    /* function broadcastToKickedUser (sentEvent, callback) {
      that.app.globalChannelService.pushMessage('connector', 'room:kick', event, 'user:' + kickedUser.id, {}, function (reponse) {
        callback(null, sentEvent);
      });
    },*/

    /**
     * /!\ .unsubscribeClients come after .historizeAndEmit to allow kicked user to receive message
     */
    function unsubscribeClients (sentEvent, callback) {
      // search for all the user sessions (any frontends)
      that.app.statusService.getSidsByUid(kickedUser.id, function (err, sids) {
        if (err) {
          return callback('Error while retrieving user status: ' + err);
        }

        if (!sids || sids.length < 1) {
          return callback(null, sentEvent); // the targeted user could be offline at this time
        }

        var parallels = [];
        _.each(sids, function (sid) {
          parallels.push(function (fn) {
            that.app.globalChannelService.leave(room.id, kickedUser.id, sid, function (err) {
              if (err) {
                return fn(sid + ': ' + err);
              }

              return fn(null);
            });
          });
        });
        async.parallel(parallels, function (err, results) {
          if (err) {
            return callback('error while unsubscribing user ' + kickedUser.id + ' from ' + room.name + ': ' + err);
          }

          return callback(null, sentEvent);
        });
      });
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
