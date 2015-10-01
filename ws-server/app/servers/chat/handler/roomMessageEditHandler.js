'use strict';
var errors = require('../../../util/errors');
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var async = require('async');
var _ = require('underscore');
var inputUtil = require('../../../util/input');
var conf = require('../../../../../config');
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

      if (!data.message && !event.data.images) {
        return callback('params-message');
      }

      if (!room) {
        return callback('room-not-found');
      }

      if (!event) {
        return callback('event-not-found');
      }

      if (event.event !== 'room:message') {
        return callback('params-message');
      }

      if (event.data.special && event.data.special !== 'me') {
        return callback('params-message');
      }

      if (event.room.toString() !== room.id) {
        return callback('not-allowed');
      }

      if (user.id !== event.user.toString()) {
        return callback('not-allowed');
      }

      if ((Date.now() - event.time) > conf.chat.message.maxedittime * 60 * 1000) {
        return callback('not-allowed');
      }

      if (data.message) {
        var message = inputUtil.filter(data.message, 512);

        if (!message) {
          return callback('message-wrong-format');
        }

        if (message === event.data.message) {
          return callback('message-wrong-format');
        }
      }

      inputUtil.mentions(message, function (err, message, markups) {
        return callback(err, message, markups.users);
      });
    },

    function persist (message, mentions, callback) {
      event.update({
        $set: { edited: true, edited_at: new Date(), 'data.message': message }
      }, function (err) {
        return callback(err, message, mentions);
      });
    },

    function broadcast (message, mentions, callback) {
      var eventToSend = {
        name: room.name,
        room_id: room.id,
        event: event.id,
        message: message
      };
      that.app.globalChannelService.pushMessage('connector', 'room:message:edit', eventToSend, room.name, {}, function (err) {
        return callback(err, mentions);
      });
    },

    function mentionNotification (mentions, callback) {
      if (!mentions || !mentions.length) {
        return callback(null);
      }

      var usersIds = _.first(_.map(mentions, 'id'), 10);
      async.each(usersIds, function (userId, fn) {
        Notifications(that.app).getType('usermention').create(userId, room, event, fn);
      }, function (err) {
        if (err) {
          logger.error(err);
        }
        callback(null);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:message:edit', next)(err);
    }

    return next(null, { success: true });
  });
};
