'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
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
        return callback('id is mandatory');
      }

      if (!room) {
        return callback('unable to retrieve room: ' + data.room_id);
      }

      if (room.isDevoice(user.id)) {
        return callback("user is devoiced, he can't type/send message in room");
      }

      if (!room.isIn(user.id)) {
        return callback('user : ' + user.username + ' is not currently in room ' + room.name);
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
      logger.error('[room:typing] ' + err);
    }

    next(err);
  });
};
