'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var Group = require('../../../../../shared/models/group');
var Notifications = require('../../../components/notifications');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var group = session.__group__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.group_id) {
        return callback('params-group-id');
      }

      if (data.message && data.message.length > 200) {
        return callback('message-wrong-format');
      }

      if (!group) {
        return callback('room-not-found');
      }

      if (group.isMember(user.id)) {
        return callback('allowed');
      }

      if (group.isAllowedPending(user.id)) {
        return callback('allow-pending');
      }

      return callback(null);
    },

    function createEvent (callback) {
      var event = {
        by_user_id: user._id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: group.owner._id,
        username: group.owner.username,
        avatar: group.owner._avatar()
      };
      callback(null, event);
    },

    function persist (eventData, callback) {
      var pendingModel = {user: user._id};
      if (data.message) {
        pendingModel.message = data.message;
      }
      Group.update(
        {_id: { $in: [group.id] }},
        {$addToSet: {members_pending: pendingModel}}, function (err) {
          return callback(err, eventData);
        }
      );
    },

    function notification (event, callback) {
      Notifications(that.app).getType('groupjoinrequest').create(group.owner.id, group, event, function (err) {
        return callback(err, event);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:join:request', next)(err);
    }

    return next(null, {success: true});
  });
};
