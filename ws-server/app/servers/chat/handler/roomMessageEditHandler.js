'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
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
        return callback('id is mandatory');
      }

      if (!data.event) {
        return callback('require event param');
      }

      if (!data.message && !event.data.images) {
        return callback('require message param');
      }

      if (!room) {
        return callback('unable to retrieve room: ' + data.room_id);
      }

      if (!event) {
        return callback('unable to retrieve event: ' + data.event);
      }

      if (event.event !== 'room:message') {
        return callback('event should be room:message: ' + data.event);
      }

      if (event.room != room.id) {
        return callback('event ' + data.event + ' not correspond to given room ' + room.name);
      }

      if (user.id !== event.user.toString()) {
        return callback(user.id + ' tries to modify message ' + data.event + ' from ' + event.user.toString());
      }

      if ((Date.now() - event.time) > conf.chat.message.maxedittime * 60 * 1000) {
        return callback(user.id + ' tries to edit an old message: ' + event.id);
      }

      if (data.message) {
        var message = inputUtil.filter(data.message, 512);

        if (!message) {
          return callback('empty message (no text)');
        }

        if (message === event.data.message) {
          return callback('posted message is the same as original');
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
      logger.error('[room:message:edit] ' + err);
    }

    next(null); // even for .notify
  });

};
