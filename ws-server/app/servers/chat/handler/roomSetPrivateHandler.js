'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var currentUser = session.__currentUser__;
  var room = session.__room__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('room_id is mandatory');
      }

      if (!room) {
        return callback('unable to retrieve room: ' + data.room_id);
      }

      if (!room.isOwner(currentUser.id) && session.settings.admin !== true) {
        return callback('User ' + currentUser.username + ' is not owner or admin');
      }

      if (room.mode === 'private') {
        return callback('Room is already private');
      }

      if (room.permanent === true) {
        return callback('This room : ' + room.name + 'is permanent can\'t set private');
      }
      return callback(null);
    },

    function persist (callback) {
      room.mode = 'private';
      room.allowed = _.without(room.getIdsByType('users'), room.owner.toString());
      room.save(function (err) {
        return callback(err);
      });
    },

    function broadcast (callback) {
      var privateEvent = {
        room_id: room.id,
        user_id: currentUser.id,
        username: currentUser.username
      };
      that.app.globalChannelService.pushMessage('connector', 'room:set:private', privateEvent, room.name, {}, callback);
    }

  ], function (err) {
    if (err) {
      logger.error('[room:allow] ' + err);
      return next(null, { code: 500, err: err });
    }

    return next(null, {success: true});
  });
};
