'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var Notifications = require('../../../components/notifications');
var roomEmitter = require('../../../util/roomEmitter');
var inputUtil = require('../../../util/input');
var common = require('@dbrugne/donut-common/server');

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

      if (!room.isOwnerOrOp(user.id) && session.settings.admin !== true) {
        return callback('no-op-owner-admin');
      }

      if (!common.validate.topic(data.topic)) {
        return callback('params');
      }

      return callback(null);
    },

    function prepareTopic (callback) {
      var topic = inputUtil.filter(data.topic, 512);
      if (topic === false) {
        topic = '';
      }

      inputUtil.mentions(topic, function (err, topic) {
        return callback(err, topic);
      });
    },

    function persist (topic, callback) {
      room.update({$set: {topic: topic}}, function (err) {
        return callback(err, topic);
      });
    },

    function broadcast (topic, callback) {
      var event = {
        room_id: room.id,
        user_id: user.id,
        username: user.username,
        avatar: user._avatar(),
        topic: topic
      };

      roomEmitter(that.app, user, room, 'room:topic', event, function (err, sentEvent) {
        return callback(err, sentEvent);
      });
    },

    function notification (sentEvent, callback) {
      Notifications(that.app).getType('roomtopic').create(room, sentEvent.id, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:topic', next)(err);
    }

    next(null, {success: true});
  });
};
