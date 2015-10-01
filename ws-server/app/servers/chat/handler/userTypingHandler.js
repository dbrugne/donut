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
  var withUser = session.__user__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.user_id) {
        return callback('params-user-id');
      }

      if (!withUser) {
        return callback('user-not-found');
      }

      return callback(null);
    },

    function broadcast (callback) {
      var typingEvent = {
        from_user_id: user.id,
        to_user_id: withUser.id,
        user_id: user.id,
        username: user.username
      };
      that.app.globalChannelService.pushMessage('connector', 'user:typing', typingEvent, 'user:' + withUser.id, {}, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('user:typing', next)(err);
    }

    return next(null, { success: true });
  });
};
