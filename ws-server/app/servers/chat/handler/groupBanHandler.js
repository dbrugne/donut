'use strict';
var _ = require('underscore');
var errors = require('../../../util/errors');
var async = require('async');
var Group = require('../../../../../shared/models/group');
// var Notifications = require('../../../components/notifications');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__user__;
  var currentUser = session.__currentUser__;
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

        if (!group.isOwner(currentUser.id) && session.settings.admin !== true) {
          return callback('not-admin-owner');
        }

        return callback(null);
      },

      function createEvent (callback) {
        event = {
          by_user_id: currentUser._id,
          by_username: currentUser.username,
          by_avatar: currentUser._avatar(),
          user_id: user._id,
          username: user.username,
          avatar: user._avatar(),
          group_id: group.id
        };
        callback(null, event);
      },

      function persistOnGroup (eventData, callback) {
        var banUser = {
          user: user._id,
          banned_at: Date.now()
        };
        if (data.reason) {
          banUser.reason = data.reason;
        }
        Group.update(
          {_id: {$in: [group.id]}},
          {
            $addToSet: {bans: banUser},
            $pull: {
              op: user._id,
              members: user._id,
              members_pending: {user: user._id}
            }
          }, function (err) {
            return callback(err, eventData);
          }
        );
      },

      function broadcastToUser (eventData, callback) {
        that.app.globalChannelService.pushMessage('connector', 'group:ban', event, 'user:' + user.id, {}, function (reponse) {
          callback(null, eventData);
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

handler.deban = function (data, session, next) {
  var user = session.__user__;
  var currentUser = session.__currentUser__;
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

        if (!group.isOwner(currentUser.id) && session.settings.admin !== true) {
          return callback('not-admin-owner');
        }

        return callback(null);
      },

      function createEvent (callback) {
        if (!group.bans || !group.bans.length) {
          return callback('not-banned');
        }

        if (!group.isBanned(user.id)) {
          return callback('not-banned');
        }

        var subDocument = _.find(group.bans, function (ban) {
          if (ban.user.toString() === user.id) {
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
          by_user_id: currentUser.id,
          by_username: currentUser.username,
          by_avatar: currentUser._avatar(),
          user_id: user.id,
          username: user.username,
          avatar: user._avatar()
        };

        that.app.globalChannelService.pushMessage('connector', 'group:deban', event, 'user:' + user.id, {}, function (reponse) {
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