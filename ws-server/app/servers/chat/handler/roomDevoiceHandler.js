'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var roomEmitter = require('../../../util/roomEmitter');
var inputUtil = require('../../../util/input');
var Notifications = require('../../../components/notifications');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var devoicedUser = session.__user__;
  var room = session.__room__;

  var that = this;

  var reason = (data.reason) ? inputUtil.filter(data.reason, 512) : false;

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('room id is mandatory');
      }

      if (!data.user_id && !data.username) {
        return callback('user_id or username is mandatory');
      }

      if (!room) {
        return callback('unable to retrieve room: ' + data.room_id);
      }

      if (!room.isOwnerOrOp(user.id) && session.settings.admin !== true) {
        return callback('this user ' + user.id + " isn't able to devoice another user in " + room.name);
      }

      if (!devoicedUser) {
        return callback('unable to retrieve devoicedUser: ' + devoicedUser.id);
      }

      if (room.isOwner(devoicedUser.id)) {
        return callback(devoicedUser.username + ' is owner and can not be devoiced of ' + room.name);
      }

      if (room.isDevoice(devoicedUser.id)) {
        return callback('this user ' + devoicedUser.username + ' is already devoiced');
      }

      if (!room.isIn(devoicedUser.id)) {
        return callback('devoiced user : ' + devoicedUser.username + ' is not currently in room ' + room.name);
      }

      return callback(null);
    },

    function persist (callback) {
      var devoice = {
        user: devoicedUser._id,
        devoiced_at: new Date()
      };
      if (reason !== false) {
        devoice.reason = reason;
      }

      room.update({$addToSet: { devoices: devoice }}, function (err) {
        return callback(err);
      });
    },

    function broadcast (callback) {
      var event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: devoicedUser.id,
        username: devoicedUser.username,
        avatar: devoicedUser._avatar()
      };
      if (reason !== false) {
        event.reason = reason;
      }

      roomEmitter(that.app, user, room, 'room:devoice', event, callback);
    },

    function notification (sentEvent, callback) {
      Notifications(that.app).getType('roomdevoice').create(devoicedUser, room, sentEvent.id, callback);
    }

  ], function (err) {
    if (err) {
      logger.error('[room:devoice] ' + err);
      return next(null, {code: 500, err: err});
    }

    next(null, { success: true });
  });
};
