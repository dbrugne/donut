'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
var roomEmitter = require('../../../util/roomEmitter');
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

      if (!devoicedUser) {
        return callback('user-not-found');
      }

      if (room.isOwner(devoicedUser)) {
        return callback('owner');
      }

      if (!room.isDevoice(devoicedUser.id)) {
        return callback('voiced');
      }

      return callback(null);
    },

    function persist (callback) {
      if (!room.devoices || !room.devoices.length) {
        return callback('not-found');
      }

      var subDocument = _.find(room.devoices, function (devoice) {
        if (devoice.user.toString() === devoicedUser.id) {
          return true;
        }
      });
      room.devoices.id(subDocument._id).remove();
      room.save(function (err) {
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

      roomEmitter(that.app, user, room, 'room:voice', event, callback);
    },

    function notification (sentEvent, callback) {
      Notifications(that.app).getType('roomvoice').create(devoicedUser, room, sentEvent.id, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:voice', next)(err);
    }

    next(null, { success: true });
  });
};
