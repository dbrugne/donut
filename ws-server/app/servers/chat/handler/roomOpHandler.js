'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename);
var async = require('async');
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
  var opedUser = session.__user__;
  var room = session.__room__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('room_id is mandatory');
      }

      if (!data.user_id && !data.username) {
        return callback('user_id or username mandatory');
      }

      if (!room) {
        return callback('unable to retrieve room: ' + data.room_id);
      }

      if (!room.isOwnerOrOp(user.id) && session.settings.admin !== true) {
        return callback('no-op');
      }

      if (!opedUser) {
        return callback('unable to retrieve opedUser in room:op: ' + data.username);
      }

      if (!room.isIn(opedUser.id)) {
        return callback('unknown-user-room');
      }

      if (room.isOwner(opedUser.id)) {
        return callback(opedUser.username + ' is owner and can not be devoiced of ' + room.name);
      }

      if (room.isOp(opedUser.id)) {
        return callback('already-oped');
      }

      return callback(null);
    },

    function persist (callback) {
      room.update({$addToSet: { op: opedUser._id }}, function (err) {
        return callback(err);
      });
    },

    function broadcast (callback) {
      var event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: opedUser.id,
        username: opedUser.username,
        avatar: opedUser._avatar()
      };

      roomEmitter(that.app, user, room, 'room:op', event, callback);
    },

    function notification (sentEvent, callback) {
      Notifications(that.app).getType('roomop').create(opedUser, room, sentEvent.id, callback);
    }

  ], function (err) {
    if (err) {
      logger.error('[room:op] ' + err);
      return next(null, {code: 500, err: 'internal'});
    }

    next(null, {});
  });
};
