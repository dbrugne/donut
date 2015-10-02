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
  var room = session.__room__;

  var read = {};

  async.waterfall([

    function check (callback) {
      if (!data.room_id && !data.name) {
        return callback('params-room-id');
      }

      if (!room) {
        return callback('room-not-found');
      }

      return callback(null);
    },

    function prepare (callback) {
      var owner = {};

      if (room.owner) {
        owner = {
          user_id: room.owner.id,
          username: room.owner.username,
          avatar: room.owner._avatar(),
          color: room.owner.color,
          is_owner: true
        };
      }

      // Default roomRead values
      read = {
        name: room.name,
        id: room.id,
        room_id: room.id,
        owner_id: owner.user_id,
        owner_username: owner.username,
        mode: room.mode
      };

      if (room.group) {
        read.group_id = room.group.id;
        read.group_name = room.group.name;
      }

      // required more values ?
      if (data.what && data.what.more && data.what.more === true) {
        read.owner_avatar = room.owner_avatar;
        read.avatar = room._avatar();
        read.poster = room._poster();
        read.color = room.color;
        read.website = room.website;
        read.topic = room.topic;
        read.description = room.description;
        read.created = room.created_at;
        if (room.isOwner(user.id)) {
          read.password = room.password;
        }
      }

      // required user list ?
      if (data.what && data.what.users && data.what.users === true) {
        var users = [];
        var alreadyIn = [];

        if (room.owner) {
          users.push(owner);
        }

        // op
        if (room.op && room.op.length > 0) {
          _.each(room.op, function (op) {
            var el = {
              user_id: op.id,
              username: op.username,
              avatar: op._avatar(),
              color: op.color,
              is_op: true
            };
            users.push(el);
            alreadyIn.push(el.user_id);
          });
        }

        // users
        if (room.users && room.users.length > 0) {
          _.each(room.users, function (u) {
            if (u.id === owner.user_id || alreadyIn.indexOf(u.id) !== -1) {
              return;
            }
            var el = {
              user_id: u.id,
              username: u.username,
              avatar: u._avatar(),
              color: u.color
            };
            users.push(el);
            alreadyIn.push(el.user_id);
          });
        }

        read.users = users;
      }

      // admin values are required
      if (data.what && data.what.admin && data.what.admin === true) {
        if (session.settings.admin === true) {
          read.password = room.password;
          read.visibility = room.visibility || false;
          read.priority = room.priority || 0;
        }
      }

      return callback(null);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:read', next)(err);
    }

    return next(null, read);
  });
};
