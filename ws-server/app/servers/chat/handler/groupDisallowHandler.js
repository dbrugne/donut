'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var Group = require('../../../../../shared/models/group');

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

  async.waterfall([

    function check (callback) {
      if (!data.group_id) {
        return callback('params-room-id');
      }

      if (!data.user_id) {
        return callback('params-user-id');
      }

      if (!group) {
        return callback('group-not-found');
      }

      if (!user) {
        return callback('user-not-found');
      }

      if (!group.isOwner(currentUser.id) && session.settings.admin !== true) {
        return callback('not-admin-owner');
      }

      if (group.isOwner(user)) {
        return callback('owner');
      }

      if (!group.isMember(user.id)) {
        return callback('not-allowed');
      }

      return callback(null);
    },

    function broadcast (callback) {
      event = {
        by_user_id: currentUser.id,
        by_username: currentUser.username,
        by_avatar: currentUser._avatar(),
        user_id: user.id,
        username: user.username,
        avatar: user._avatar(),
        reason: 'Disallow'
      };
      callback(null, event);
    },

    function broadcastToUser (eventData, callback) {
      that.app.globalChannelService.pushMessage('connector', 'group:disallow', event, 'user:' + user.id, {}, function (reponse) {
        callback(null, eventData);
      });
    },

    function persistOnGroup (eventData, callback) {
      Group.update(
        {_id: { $in: [group.id] }},
        {$pull: {members: user.id, op: user.id}}, function (err) {
          return callback(err, eventData);
        }
      );
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:disallow', next)(err);
    }

    return next(null, {success: true});
  });
};
