var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Notifications = require('../../../components/notifications');
var oneEmitter = require('../../../util/oneEmitter');
var inputUtil = require('../../../util/input');
var keenio = require('../../../../../shared/io/keenio');

var Handler = function(app) {
  this.app = app;
};

module.exports = function(app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.me = function(data, session, next) {

  var user = session.__currentUser__;
  var withUser = session.__user__;

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.username)
        return callback('username is mandatory');

      if (!withUser)
        return callback('unable to retrieve withUser: ' + data.username);

      if (withUser.isBanned(user.id))
        return callback('user is banned by withUser');

      return callback(null);
    },

    function persistOnBoth(callback) {
      user.update({$addToSet: { onetoones: withUser._id }}, function(err) {
        if (err)
          return callback(err);
        withUser.update({$addToSet: { onetoones: user._id }}, function(err) {
          return callback(err);
        });
      });
    },

    function prepareMessage(callback) {
      // text filtering
      var message = inputUtil.filter(data.message, 512);

      if (!message)
        return callback('empty message (no text)');

      // mentions
      inputUtil.mentions(message, function(err, message) {
        return callback(err, message);
      });
    },

    function prepareEvent(message, callback) {
      var event = {
        from_user_id  : user.id,
        from_username : user.username,
        from_avatar   : user._avatar(),
        to_user_id    : withUser.id,
        to_username   : withUser.username,
        time          : Date.now()
      };

      if (message)
        event.message = message;

      return callback(null, event);
    },

    function historizeAndEmit(event, callback) {
      oneEmitter(that.app, { from: user._id, to: withUser._id} , 'user:me', event, callback);
    },

    function notification(event, callback) {
      Notifications(that.app).getType('usermessage').create(withUser, event.id, function(err) {
        return callback(err, event);
      });
    },

    function tracking(event, callback) {
      var messageEvent = {
        session: {
          id: session.settings.uuid,
          connector: session.frontendId
        },
        user: {
          id: user.id,
          username: user.username,
          admin: (session.settings.admin === true)
        },
        to: {
          id: withUser.id,
          username: withUser.username,
          admin: (withUser.admin === true)
        },
        message: {
          length: (event.message && event.message.length) ? event.message.length : 0
        }
      };
      keenio.addEvent("onetoone_me", messageEvent, function(err){
        if (err)
          logger.error('Error while tracking onetoone_me in keen.io for ' + user.id + ': '+err);

        return callback(null);
      });
    }

  ], function(err) {
    if (err) {
      logger.error('[user:me] ' + err);
      return next(null, { code: 500, err: err });
    }

    return next(null, { success: true });
  });

};