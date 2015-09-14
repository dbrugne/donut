'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var Room = require('../../../../../shared/models/room');
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
  var user = session.__user__;
  var currentUser = session.__currentUser__;
  var room = session.__room__;

  var that = this;

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

      if (!room.isAllowed(user.id)) {
        return callback('user isn\'t allowed in room ' + room.name);
      }

      return callback(null);
    },

    function broadcast (callback) {
      var event = {
        by_user_id: currentUser.id,
        by_username: currentUser.username,
        by_avatar: currentUser._avatar(),
        user_id: user.id,
        username: user.username,
        avatar: user._avatar()
      };

      roomEmitter(that.app, user, room, 'room:disallow', event, callback);
    },

    function persist (eventData, callback) {
      Room.update(
        {_id: { $in: [room.id] }},
        {$pull: {join_mode_allowed: user.id, users: user.id}}, function (err) {
          return callback(err, eventData);
        }
      );
    }

  ], function (err) {
    if (err) {
      logger.error('[room:disallow] ' + err);
      return next(null, { code: 500, err: err });
    }

    return next(null, {success: true});
  });
};
