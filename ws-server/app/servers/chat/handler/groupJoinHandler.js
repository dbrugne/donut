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
  var user = session.__currentUser__;
  var group = session.__group__;

  async.waterfall([

    function check (callback) {
      if (!data.group_id) {
        return callback('params-group-id');
      }

      if (data.message && data.message.length > 200) {
        return callback('message-wrong-format');
      }

      if (!group) {
        return callback('group-not-found');
      }

      if ((!group.password || !data.password) && !group.canUserJoin(user.id, user.emails)) {
        return callback('params-password');
      }

      if (group.isMember(user.id)) {
        return callback('allowed');
      }

      if (group.isBanned(user.id)) {
        return callback('group-banned');
      }

      return callback(null);
    },

    function checkPassword (callback) {
      if (!group.validPassword(data.password) && !group.canUserJoin(user.id, user.emails)) {
        return callback('wrong-password');
      } else {
        return callback(null);
      }
    },

    function persist (callback) {
      Group.update(
        {_id: { $in: [group.id] }},
        {$addToSet: {members: user._id}, $pull: {members_pending: {user: user._id}}
        }, function (err) {
          return callback(err);
        }
      );
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:join', next)(err);
    }

    return next(null, {success: true});
  });
};
