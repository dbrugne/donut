'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename);
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

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('room_id is mandatory');
      }

      if (!data.user_id) {
        return callback('user_id is mandatory');
      }

      if (!room) {
        return callback('unable to retrieve room: ' + data.room_id);
      }

      if (!room.isOwner(currentUser.id)) {
        return callback('User ' + currentUser.username + ' is not owner');
      }

      if (room.isOwner(user)) {
        return callback('User ' + user.username + ' is owner');
      }

      if (!room.isAllowed(user.id)) {
        return callback('user isn\'t allowed in room ' + room.name);
      }

      return callback(null);
    },

    function broadcast (callback) {
      event = {
        by_user_id: currentUser.id,
        by_username: currentUser.username,
        by_avatar: currentUser._avatar(),
        user_id: user.id,
        username: user.username,
        avatar: user._avatar()
      };

      roomEmitter(that.app, user, room, 'room:disallow', event, callback);
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
        {$pull: {allowed: user.id, users: user.id}}, function (err) {
          return callback(err, eventData);
        }
      );
    },

    function persistOnUser (eventData, callback) {
      user.update({
        $addToSet: {blocked: room.id}
      }, function (err) {
        return callback(err, eventData);
      });
    }

  ], function (err) {
    if (err) {
      logger.error('[room:disallow] ' + err);
      return next(null, { code: 500, err: 'internal' });
    }

    return next(null, {success: true});
  });
};
