'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var oneEmitter = require('../../../util/one-emitter');

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
        user_id: user.id,
        username: user.username,
        avatar: user._avatar(),
        to_user_id: bannedUser.id,
        to_username: bannedUser.username,
        to_avatar: bannedUser._avatar()
      };
      oneEmitter(that.app, user, bannedUser, 'user:ban', event, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('user:ban', next)(err);
    }

    next(null, {});
  });
};
