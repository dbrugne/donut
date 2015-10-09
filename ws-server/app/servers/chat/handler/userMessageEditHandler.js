'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var async = require('async');
var inputUtil = require('../../../util/input');
var conf = require('../../../../../config');
var errors = require('../../../util/errors');

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
        return callback('params-user-id');
      }

      if (!data.event) {
        return callback('params-events');
      }

      if (!data.message && !event.data.images) {
        return callback('params');
      }

      if (!withUser) {
        return callback('user-not-found');
      }

      if (!event) {
        return callback('event-not-found');
      }

      if (event.event !== 'user:message') {
        return callback('params-events');
      }

      if (event.data.special && event.data.special !== 'me') {
        return callback('params');
      }

      if (user.id !== event.from.toString()) {
        return callback('params-events');
      }

      if ((Date.now() - event.time) > conf.chat.message.maxedittime * 60 * 1000) {
        return callback('expired-time');
      }

      if (data.message) {
        var message = inputUtil.filter(data.message, 512);
        if (!message) {
          return callback('params-message');
        }

        if (event.data.message === message) {
          return callback('params-message');
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

    function persistOnBoth (message, callback) {
      user.updateActivity(withUser._id, function (err) {
        if (err) {
          return callback(err, message);
        }
        withUser.updateActivity(user._id, function (err) {
          return callback(err, message);
        });
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
        if (err) {
          logger.error(err); // not 'return', we delete even if error happen
        }

        return callback(null, eventToSend);
      });
    },

    function broadcastTo (eventToSend, callback) {
      if (user.id === withUser.id) {
        return callback(null);
      }
      that.app.globalChannelService.pushMessage('connector', 'user:message:edit', eventToSend, 'user:' + withUser.id, {}, function (err) {
        if (err) {
          logger.error(err); // not 'return', we delete even if error happen
        }

        return callback(null);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('user:message:edit', next)(err);
    }

    return next(null, { success: true });
  });
};
