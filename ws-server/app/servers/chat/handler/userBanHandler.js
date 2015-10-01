'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var oneEmitter = require('../../../util/oneEmitter');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var bannedUser = session.__user__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.username && !data.user_id) {
        return callback('params-username-user-id');
      }

      if (!bannedUser) {
        return callback('user-not-found');
      }

      if (user.isBanned(bannedUser.id)) {
        return callback('banned');
      }

      return callback(null);
    },

    function persist (callback) {
      var ban = {
        user: bannedUser._id,
        banned_at: new Date()
      };
      user.update({$addToSet: {bans: ban}}, function (err) {
        return callback(err);
      });
    },

    function historizeAndEmit (callback) {
      var event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: bannedUser.id,
        username: bannedUser.username,
        avatar: bannedUser._avatar()
      };
      oneEmitter(that.app, {
        from: user._id,
        to: bannedUser._id
      }, 'user:ban', event, callback);
    }

  ], function (err) {
    if (err) {
     return errors.getHandler('user:ban', next)(err);
    }

    next(null, {});
  });
};
