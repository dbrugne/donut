'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var inputUtil = require('../../../util/input');
var conf = require('../../../../../config');
var common = require('@dbrugne/donut-common');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var withUser = session.__user__;
  var event = session.__event__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.user_id) {
        return callback('user_id is mandatory');
      }

      if (!data.event) {
        return callback('require event param');
      }

      if (!data.message && !data.images) {
        return callback('require message param');
      }

      if (!withUser) {
        return callback('Unable to retrieve user: ' + data.username);
      }

      if (!event) {
        return callback('Unable to retrieve event: ' + data.event);
      }

      if (event.event !== 'user:message') {
        return callback('event should be a user:message: ' + data.event);
      }

      if (user.id !== event.from.toString()) {
        return callback(user.username + ' tries to modify a message ' + data.event + ' from ' + event.from.toString());
      }

      if ((Date.now() - event.time) > conf.chat.message.maxedittime * 60 * 1000) {
        return callback('user ' + user.id + ' tries to edit an old message: ' + event.id);
      }

      if (data.message) {
        var message = inputUtil.filter(data.message, 512);
        if (!message) {
          return callback('empty message (no text)');
        }

        if (event.data.message === message) {
          return callback('posted message is the same as original');
        }
      }
      // mentions
      inputUtil.mentions(message, function (err, message) {
        return callback(err, message);
      });
    },

    function persist (message, callback) {
      event.update({
        $set: { edited: true, edited_at: new Date(), 'data.message': message }
      }, function (err) {
        return callback(err, message);
      });
    },

    function prepareEvent (message, callback) {
      var eventToSend = {
        from_user_id: user._id,
        from_username: user.username,
        to_user_id: withUser._id,
        to_username: withUser.username,
        event: event.id,
        message: message
      };

      return callback(null, eventToSend);
    },

    function broadcastFrom (eventToSend, callback) {
      that.app.globalChannelService.pushMessage('connector', 'user:message:edit', eventToSend, 'user:' + user.id, {}, function (err) {
        if (err)
          logger.error(err); // not 'return', we delete even if error happen

        return callback(null, eventToSend);
      });
    },

    function broadcastTo (eventToSend, callback) {
      if (user.id === withUser.id)
        return callback(null);

      that.app.globalChannelService.pushMessage('connector', 'user:message:edit', eventToSend, 'user:' + withUser.id, {}, function (err) {
        if (err)
          logger.error(err); // not 'return', we delete even if error happen

        return callback(null);
      });
    }

  ], function (err) {
    if (err)
      logger.error('[user:message:edit] ' + err);

    next(null); // even for .notify
  });

};
