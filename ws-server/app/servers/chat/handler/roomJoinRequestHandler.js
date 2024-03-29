'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var Room = require('../../../../../shared/models/room');
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
  var room = session.__room__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('params-room-id');
      }

      if (data.message && data.message.length > 200) {
        return callback('message-wrong-format');
      }

      if (!room || room.deleted) {
        return callback('room-not-found');
      }

      if (room.isBanned(user.id)) {
        return callback('banned');
      }

      if (room.isAllowed(user.id)) {
        return callback('already-allowed');
      }

      if (room.isAllowedPending(user.id)) {
        return callback('allow-pending');
      }

      if (!room.allow_user_request) {
        return callback('not-allowed');
      }

      if (room.isGroupBanned(user.id)) {
        return callback('group-banned');
      }

      if (user.confirmed === false) {
        return callback('not-confirmed');
      }

      return callback(null);
    },

    function createEvent (callback) {
      var event = {
        by_user_id: user._id,
        by_username: user.username,
        by_avatar: user._avatar()
      };
      if (room.owner) {
        event.user_id = room.owner._id;
        event.username = room.owner.username;
        event.avatar = room.owner._avatar();
      }
      callback(null, event);
    },

    function persist (eventData, callback) {
      var pendingModel = {user: user._id};
      if (data.message) {
        pendingModel.message = data.message;
      }
      Room.update(
        {_id: { $in: [room.id] }},
        {$addToSet: {allowed_pending: pendingModel}}, function (err) {
          return callback(err, eventData);
        });
    },

    function notification (event, callback) {
      var ids = room.getIdsByType('op');
      async.eachLimit(ids, 10, function (id, fn) {
        Notifications(that.app).getType('roomjoinrequest').create(id, room, event, fn);
      }, function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:join:request', next)(err);
    }

    return next(null, {success: true});
  });
};

