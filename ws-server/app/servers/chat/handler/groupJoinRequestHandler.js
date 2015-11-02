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

      if (!group || group.deleted) {
        return callback('group-not-found');
      }

      if (group.isMember(user.id)) {
        return callback('allowed');
      }

      if (group.isAllowedPending(user.id)) {
        return callback('allow-pending');
      }

      if (group.isBanned(user.id)) {
        return callback('not-allowed');
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
      var ids = group.getIdsByType('op');
      async.eachLimit(ids, 10, function (id, fn) {
        Notifications(that.app).getType('groupjoinrequest').create(id, group, event,  fn);
      }, function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:join:request', next)(err);
    }

    return next(null, {success: true});
  });
};

