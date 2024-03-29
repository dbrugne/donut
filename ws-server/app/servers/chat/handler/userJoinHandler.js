'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var oneDataHelper = require('../../../util/one-data');

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

    function welcome (callback) {
      oneDataHelper(that.app, user, { user: withUser, last_event_at: Date.now() }, callback);
    },

    function persist (oneData, callback) {
      // only 'up' the discussion for user that is opening
      user.updateActivity(withUser._id, null, function (err) {
        return callback(err, oneData);
      });
    },

    function send (oneData, callback) {
      that.app.globalChannelService.pushMessage('connector', 'user:join', oneData, 'user:' + user.id, {}, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('user:join', next)(err);
    }

    return next(null);
  });
};
