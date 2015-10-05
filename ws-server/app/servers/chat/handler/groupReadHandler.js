'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');

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

  var read = {};

  async.waterfall([

    function check (callback) {
      if (!data.group_id && !data.group) {
        return callback('params-group-id');
      }

      if (!group) {
        return callback('group-not-found');
      }

      return callback(null);
    },

    function prepare (callback) {
      var members = [];
      var alreadyIn = [];

      // owner
      var owner = {};
      if (group.owner) {
        owner = {
          user_id: group.owner.id,
          username: group.owner.username,
          avatar: group.owner._avatar(),
          color: group.owner.color,
          is_owner: true
        };
        members.push(owner);
      }

      // op
      if (group.op && group.op.length > 0) {
        _.each(group.op, function (op) {
          var el = {
            user_id: op.id,
            username: op.username,
            avatar: op._avatar(),
            color: op.color,
            is_op: true
          };
          members.push(el);
          alreadyIn.push(el.user_id);
        });
      }

      // users
      if (group.members && group.members.length > 0) {
        _.each(group.members, function (u) {
          if (u.id === owner.user_id || alreadyIn.indexOf(u.id) !== -1) {
            return;
          }
          var el = {
            user_id: u.id,
            username: u.username,
            avatar: u._avatar(),
            color: u.color
          };
          members.push(el);
          alreadyIn.push(el.user_id);
        });
      }

      read = {
        name: group.name,
        group_id: group.id,
        owner_id: owner.user_id,
        owner_username: owner.username,
        members: members,
        avatar: group._avatar(),
        color: group.color,
        website: group.website,
        description: group.description,
        disclaimer: group.disclaimer,
        created: group.created_at
      };

      // @todo hydrate rooms

      if (group.isOwner(user.id) || session.settings.admin === true) {
        read.password = group.password;
      }

      if (session.settings.admin === true) {
        read.visibility = group.visibility || false;
        read.priority = group.priority || 0;
      }

      return callback(null);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:read', next)(err);
    }

    return next(null, read);
  });
};
