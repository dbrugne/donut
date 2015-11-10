'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var errors = require('../../../util/errors');
var async = require('async');
var Notifications = require('../../../components/notifications');
var oneEmitter = require('../../../util/oneEmitter');
var inputUtil = require('../../../util/input');
var filesUtil = require('../../../util/files');
var keenio = require('../../../../../shared/io/keenio');

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

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.user_id && !data.username) {
        return callback('params-username-user-id');
      }

      if (!withUser) {
        return callback('user-not-found');
      }

      if (withUser.isBanned(user.id)) {
        return callback('banned');
      }

      if (data.special && ['me', 'random'].indexOf(data.special) === -1) {
        return callback('not-allowed');
      }

      return callback(null);
    },

    function persistOnBoth (callback) {
      user.updateActivity(withUser._id, function (err) {
        if (err) {
          return callback(err);
        }
        withUser.updateActivity(user._id, function (err) {
          return callback(err);
        });
      });
    },

    function prepareMessage (callback) {
      // text filtering
      var message = inputUtil.filter(data.message, 512);

      // files filtering
      var files = filesUtil.filter(data.files);

      if (!message && !files) {
        return callback('params-message');
      }

      // mentions
      inputUtil.mentions(message, function (err, message) {
        return callback(err, message, files);
      });
    },

    function historizeAndEmit (message, files, callback) {
      var event = {
        from_user_id: user.id,
        from_username: user.username,
        from_realname: user.realname,
        from_avatar: user._avatar(),
        to_user_id: withUser.id,
        to_username: withUser.username,
        to_realname: withUser.realname,
        time: Date.now()
      };

      if (message) {
        event.message = message;
      }
      if (files && files.length) {
        event.files = files;
      }
      if (data.special) {
        event.special = data.special;
      }
      oneEmitter(that.app, {
        from: user._id,
        to: withUser._id
      }, 'user:message', event, callback);
    },

    function notification (event, callback) {
      Notifications(that.app).getType('usermessage').create(withUser, event.id, function (err) {
        return callback(err, event);
      });
    },

    function tracking (event, callback) {
      var messageEvent = {
        session: {
          id: session.settings.uuid,
          connector: session.frontendId
        },
        user: {
          id: user.id,
          username: user.username,
          realname: user.realname,
          admin: (session.settings.admin === true)
        },
        to: {
          id: withUser.id,
          username: withUser.username,
          realname: withUser.realname,
          admin: (withUser.admin === true)
        },
        message: {
          length: (event.message && event.message.length)
            ? event.message.length
            : 0,
          images: (event.files && event.files.length)
            ? event.files.length
            : 0
        }
      };
      keenio.addEvent('onetoone_message', messageEvent, function (err) {
        if (err) {
          logger.error(err);
        }

        return callback(null);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('user:message', next)(err);
    }

    return next(null, {success: true});
  });
};
