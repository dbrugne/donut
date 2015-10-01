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
  var currentUser = session.__currentUser__;
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

      if (!room.isOwner(currentUser.id) && session.settings.admin !== true) {
        return callback('no-op-owner-admin');
      }

      if (room.mode === 'private') {
        return callback('private');
      }

      if (room.permanent === true) {
        return callback('permanent');
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
      return errors.getHandler('room:set:private', next)(err);
    }

    return next(null, {success: true});
  });
};
