'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
var Room = require('../../../../../shared/models/room');
var roomEmitter = require('../../../util/roomEmitter');

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

  var event = {};

  var wasInRoom = false;

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

      if (!user) {
        return callback('user-not-found');
      }

      if (!room.isOwner(currentUser.id) && session.settings.admin !== true) {
        return callback('no-admin-owner');
      }

      if (room.isOwner(user)) {
        return callback('owner');
      }

      if (!room.isAllowed(user.id)) {
        return callback('no-allow');
      }

      return callback(null);
    },

    function broadcast (callback) {
      wasInRoom = room.isIn(user.id);

      event = {
        by_user_id: currentUser.id,
        by_username: currentUser.username,
        by_avatar: currentUser._avatar(),
        user_id: user.id,
        username: user.username,
        avatar: user._avatar(),
        reason: 'Disallow'
      };

      roomEmitter(that.app, user, room, 'room:kick', event, callback);
    },

    function broadcastToUser (eventData, callback) {
      that.app.globalChannelService.pushMessage('connector', 'room:disallow', event, 'user:' + user.id, {}, function (reponse) {
        callback(null, eventData);
      });
    },

    /**
     * /!\ .unsubscribeClients come after .historizeAndEmit to allow kicked user to receive message
     */
    function unsubscribeClients (sentEvent, callback) {
      // search for all the user sessions (any frontends)
      that.app.statusService.getSidsByUid(user.id, function (err, sids) {
        if (err) {
          return callback('Error while retrieving user status: ' + err);
        }

        if (!sids || sids.length < 1) {
          return callback(null, sentEvent); // the targeted user could be offline at this time
        }

        var parallels = [];
        _.each(sids, function (sid) {
          parallels.push(function (fn) {
            that.app.globalChannelService.leave(room.name, user.id, sid, function (err) {
              if (err) {
                return fn(sid + ': ' + err);
              }

              return fn(null);
            });
          });
        });
        async.parallel(parallels, function (err, results) {
          if (err) {
            return callback('error while unsubscribing user ' + user.id + ' from ' + room.name + ': ' + err);
          }

          return callback(null, sentEvent);
        });
      });
    },

    function persistOnRoom (eventData, callback) {
      Room.update(
        {_id: { $in: [room.id] }},
        {$pull: {allowed: user.id, users: user.id, op: user.id, devoices: {user: user.id}}}, function (err) {
          return callback(err, eventData);
        }
      );
    },

    function persistOnUser (eventData, callback) {
      if (!wasInRoom) {
        return callback(null, eventData);
      }

      user.update({
        $addToSet: {blocked: room.id}
      }, function (err) {
        return callback(err, eventData);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:disallow', next)(err);
    }

    return next(null, {success: true});
  });
};

handler.group = function (data, session, next) {
  var currentUser = session.__currentUser__;
  var room = session.__room__;

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('params-room-id');
      }

      if (!room) {
        return callback('room-not-found');
      }

      if (!room.group) {
        return callback('group-not-found');
      }

      if (!room.isOwner(currentUser.id) && session.settings.admin !== true) {
        return callback('no-admin-owner');
      }

      if (!room.allow_group_member) {
        return callback('no-allow');
      }

      return callback(null);
    },

    function persist (callback) {
      room.allow_group_member = false;
      room.save(function (err) {
        return callback(err);
      });
    },

    function addUsersToAllow (callback) {
      Room.update(
        {_id: { $in: [room.id] }},
        {$addToSet: {allowed: {$each: room.getIdsByType('users')}}}, function (err) {
          return callback(err);
        }
      );
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:group:disallow', next)(err);
    }

    return next(null, {success: true});
  });
};