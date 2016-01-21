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
  var addMember = false;
  var options = {
    request: false,
    password: false
  };

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

      if (group.isMember(user.id)) {
        return callback('already-member');
      }

      if (group.isBanned(user.id)) {
        return callback('group-banned');
      }

      addMember = group.isAllowed(user.id);
      return callback(null);
    },

    function checkPassword (callback) {
      if (addMember || !data.password) {
        return callback(null);
      }
      if (!group.validPassword(data.password)) {
        return callback('wrong-password');
      } else {
        addMember = true;
        return callback(null);
      }
    },

    function checkUserMail (callback) {
      if (!user.emails || !group.allowed_domains || group.allowed_domains.length < 1) {
        return callback(null);
      }
      if (!user.hasAllowedEmail(group.allowed_domains)) {
        return callback(null);
      } else {
        addMember = true;
        return callback(null);
      }
    },

    function prepareOptions (callback) {
      if (addMember) {
        return callback(null);
      }

      if (group.password) {
        options.password = true;
      }

      options.isAllowedPending = group.isAllowedPending(user.id);
      if (group.allow_user_request) {
        options.request = true;
      }

      if (group.allowed_domains && group.allowed_domains.length) {
        options.allowed_domains = group.allowed_domains;
      }

      return callback(null);
    },

    function persist (callback) {
      if (!addMember) {
        options.group_id = group._id;
        options.name = group.name;
        options.identifier = group.getIdentifier();
        options.owner_username = group.owner.username;
        options.disclaimer = group.disclaimer;
        return callback(null);
      }

      Group.update(
        {_id: group._id},
        {
          $addToSet: {members: user._id},
          $pull: {
            members_pending: {user: user._id},
            allowed: user._id // when become member remove from allowed
          }
        }, function (err) { return callback(err); }
      );
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:become:member', next)(err);
    }

    return next(null, {success: addMember, options: options});
  });
};
