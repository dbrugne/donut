'use strict';
var errors = require('../../../util/errors');
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

      return callback(null);
    },

    function persistOnUser (callback) {
      user.removeBlockedRoom(room.id, function (err) {
        return callback(err);
      });
    },

    function sendToUserClients (callback) {
      that.app.globalChannelService.pushMessage('connector', 'room:leave', {name: room.name, room_id: room.id}, 'user:' + user.id, {}, function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:leave:block', next)(err);
    }

    return next(null);
  });
};
