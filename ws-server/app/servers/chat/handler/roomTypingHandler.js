'use strict';
var errors = require('../../../util/errors');
var async = require('async');

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

      if (!room) {
        return callback('room-not-found');
      }

      if (room.isDevoice(user.id)) {
        return callback('devoiced');
      }

      if (!room.isIn(user.id)) {
        return callback('no-in');
      }

      return callback(null);
    },

    function broadcast (callback) {
      var typingEvent = {
        room_id: room.id,
        user_id: user.id,
        username: user.username
      };
      that.app.globalChannelService.pushMessage('connector', 'room:typing', typingEvent, room.name, {}, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:typing', next)(err);
    }

    next(err);
  });
};
