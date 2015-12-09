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
        return callback('not-banned');
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
        user_id: user.id,
        username: user.username,
        avatar: user._avatar(),
        to_user_id: bannedUser.id,
        to_username: bannedUser.username,
        to_avatar: bannedUser._avatar()
      };
      oneEmitter(that.app, 'user:deban', event, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('user:deban', next)(err);
    }

    next(null, {});
  });
};
