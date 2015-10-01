'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
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

      if (!user.isBanned(bannedUser.id)) {
        return callback('no-banned');
      }

      return callback(null);
    },

    function persist (callback) {
      var subDocument = _.find(user.bans, function (ban) {
        if (ban.user.toString() === bannedUser.id) {
          return true;
        }
      });
      user.bans.id(subDocument._id).remove();
      user.save(function (err) {
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
      }, 'user:deban', event, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('user:deban', next)(err);
    }

    next(null, {});
  });
};
