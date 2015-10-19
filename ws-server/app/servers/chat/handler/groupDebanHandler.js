'use strict';
var _ = require('underscore');
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
  var targetUser = session.__user__;
  var user = session.__currentUser__;
  var group = session.__group__;

  var that = this;

  var event = {};

  async.waterfall(
    [
      function check (callback) {
        if (!data.group_id) {
          return callback('params-group-id');
        }

        if (!data.user_id) {
          return callback('params-user-id');
        }

        if (!group) {
          return callback('group-not-found');
        }

        if (!group.isOwner(user.id) && !group.isOp(user.id) && session.settings.admin !== true) {
          return callback('not-admin-owner');
        }

        return callback(null);
      },

      function createEvent (callback) {
        if (!group.bans || !group.bans.length) {
          return callback('not-banned');
        }

        if (!group.isBanned(targetUser.id)) {
          return callback('not-banned');
        }

        var subDocument = _.find(group.bans, function (ban) {
          if (ban.user.id === targetUser.id) {
            return true;
          }
        });
        group.bans.id(subDocument._id).remove();
        group.save(function (err) {
          return callback(err);
        });
      },

      function broadcast (callback) {
        event = {
          by_user_id: user.id,
          by_username: user.username,
          by_avatar: user._avatar(),
          user_id: targetUser.id,
          username: targetUser.username,
          avatar: targetUser._avatar()
        };

        that.app.globalChannelService.pushMessage('connector', 'group:deban', event, 'user:' + targetUser.id, {}, function (reponse) {
          callback(null);
        });
      }
    ],
    function (err) {
      if (err) {
        return errors.getHandler('group:ban', next)(err);
      }

      return next(null, {success: true});
    }
  );
};