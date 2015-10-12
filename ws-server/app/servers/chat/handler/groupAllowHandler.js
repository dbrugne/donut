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
  var user = session.__user__;
  var currentUser = session.__currentUser__;
  var group = session.__group__;

  var that = this;

  var wasPending = false;

  var event = {};

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

      if (!group.isOwner(currentUser.id) && session.settings.admin !== true) {
        return callback('not-admin-owner');
      }

      if (group.isMember(user.id)) {
        return callback('allowed');
      }

      return callback(null);
    },

    function createEvent (callback) {
      wasPending = group.isAllowedPending(user.id);

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

    function broadcastToUser (eventData, callback) {
      that.app.globalChannelService.pushMessage('connector', 'group:allow', event, 'user:' + user.id, {}, function (reponse) {
        callback(null, eventData);
      });
    },

    function persist (eventData, callback) {
      Group.update(
        {_id: { $in: [group.id] }},
        {$addToSet: {members: user.id}}, function (err) {
          if (wasPending) {
            Group.update(
              {_id: { $in: [group.id] }},
              {$pull: {members_pending: {user: user.id}}}
              , function (err) {
                return callback(err, eventData);
              }
            );
          } else {
            return callback(err, eventData);
          }
        }
      );
    },

    function notification (event, callback) {
      if (!wasPending) {
        Notifications(that.app).getType('groupinvite').create(user.id, group, event, function (err) {
          return callback(err, event);
        });
      } else {
        Notifications(that.app).getType('groupallowed').create(user.id, group, event, function (err) {
          return callback(err, event);
        });
      }
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:allow', next)(err);
    }

    return next(null, {success: true});
  });
};

handler.refuse = function (data, session, next) {
  var user = session.__user__;
  var currentUser = session.__currentUser__;
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

      if (!group.isOwner(currentUser.id) && session.settings.admin !== true) {
        return callback('not-admin-owner');
      }

      if (group.isMember(user.id)) {
        return callback('allowed');
      }

      if (!group.isAllowedPending(user.id)) {
        return callback('no-allow-pending');
      }

      return callback(null);
    },

    function broadcast (callback) {
      var event = {
        by_user_id: currentUser.id,
        by_username: currentUser.username,
        by_avatar: currentUser._avatar(),
        user_id: user.id,
        username: user.username,
        avatar: user._avatar()
      };
      callback(null, event);
    },

    function persist (eventData, callback) {
      Group.update(
        {_id: { $in: [group.id] }},
        {$pull: {members_pending: {user: user.id}}}, function (err) {
          return callback(err, eventData);
        }
      );
    },

    function notification (event, callback) {
      Notifications(that.app).getType('grouprefuse').create(user.id, group, event, function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:allow:refuse', next)(err);
    }

    return next(null, {success: true});
  });
};