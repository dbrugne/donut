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

      return callback(null);
    },

    function persistOnUser (callback) {
      user.resetUnviewedRoom(room._id, callback);
    },

    function sendToUserSockets (callback) {
      var viewedEvent = {
        room_id: room.id
      };
      that.app.globalChannelService.pushMessage('connector', 'room:viewed', viewedEvent, 'user:' + user.id, {}, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:viewed', next)(err);
    }

    next(err);
  });
};
