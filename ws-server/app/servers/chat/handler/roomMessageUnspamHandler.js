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
  var event = session.__event__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('params-room-id');
      }

      if (!data.event) {
        return callback('params-events');
      }

      if (!room) {
        return callback('room-not-found');
      }

      if (!room.isOwnerOrOp(user.id) && session.settings.admin !== true) {
        return callback('not-op-owner-admin');
      }

      if (!event) {
        return callback('event-not-found');
      }

      if (event.room.toString() !== room.id) {
        return callback('not-allowed');
      }

      if (event.event !== 'room:message') {
        return callback('wrong-format');
      }

      return callback(null);
    },

    function persist (callback) {
      event.update({$unset: {spammed: true, spammed_at: true}}, function (err) {
        return callback(err);
      });
    },

    function persist (callback) {
      // Update topic and activity date
      room.lastactivity_at = Date.now();
      room.save(function (err) {
        return callback(err);
      });
    },

    function broadcast (callback) {
      var eventToSend = {
        room_id: room.id,
        event: event.id
      };
      that.app.globalChannelService.pushMessage('connector', 'room:message:unspam', eventToSend, room.name, {}, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:message:unspam', next)(err);
    }

    next(null, {});
  });
};
