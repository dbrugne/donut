'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var GroupModel = require('../../../../../shared/models/group');
var Notifications = require('../../../components/notifications');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.add = function (data, session, next) {
  var targetUser = session.__user__;
  var user = session.__currentUser__;
  var group = session.__group__;

  var that = this;

  async.waterfall([

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

      if (group.isMember(targetUser.id)) {
        return callback('already-member');
      }

      if (group.isAllowed(targetUser.id)) {
        return callback('already-allowed');
      }

      if (group.isBanned(targetUser.id)) {
        return callback('group-banned');
      }

      if (group.isAllowedPending(targetUser.id)) {
        return callback('request-pending');
      }

      return callback(null);
    },

    function persist (callback) {
      GroupModel.update(
        {_id: group._id},
        {$addToSet: {allowed: targetUser.id}},
        function (err) { return callback(err); }
      );
    },

    function notification (callback) {
      var event = {
        by_user_id: user._id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: targetUser._id,
        username: targetUser.username,
        avatar: targetUser._avatar(),
        color: targetUser.color,
        group_id: group.id
      };
      Notifications(that.app).getType('groupinvite').create(targetUser.id, group, event, function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:allowed:add', next)(err);
    }

    return next(null, {success: true});
  });
};

handler.remove = function (data, session, next) {
  var targetUser = session.__user__;
  var user = session.__currentUser__;
  var group = session.__group__;

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

      if (!targetUser) {
        return callback('user-not-found');
      }

      if (!group.isOwner(user.id) && !group.isOp(user.id) && session.settings.admin !== true) {
        return callback('not-admin-owner');
      }

      if (group.isOwner(targetUser)) {
        return callback('owner');
      }

      if (!group.isAllowed(targetUser.id)) {
        return callback('not-allowed');
      }

      return callback(null);
    },

    function persistOnGroup (callback) {
      GroupModel.update(
        {_id: { $in: [group.id] }},
        {$pull: {allowed: targetUser.id}},
        function (err) {
          return callback(err);
        });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:allowed:remove', next)(err);
    }

    return next(null, {success: true});
  });
};
