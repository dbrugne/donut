'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
var RoomModel = require('../../../../../shared/models/room');
var GroupModel = require('../../../../../shared/models/group');

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
  var what = data.what;

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

    function basic (callback) {
      read = {
        room_id: room.id,
        identifier: room.getIdentifier(),
        name: room.name,
        mode: room.mode
      };
      if (room.group) {
        read.group_id = room.group.id;
        read.group_name = room.group.name;
        read.group_owner = room.group.owner;
        read.allow_group_member = room.allow_group_member;
      }
      if (room.owner) {
        read.owner_id = room.owner.id;
        read.owner_username = room.owner.username;
      }
      if (room.mode !== 'public') {
        read.allow_user_request = room.allow_user_request;
      }

      return callback(null);
    },

    function canDelete (callback) {
      if (room.permanent) {
        read.can_delete = false;
        return callback(null);
      }
      if (!room.group) {
        read.can_delete = true;
        return callback(null);
      }

      // check group default room
      GroupModel.findById(room.group.id).exec(function (err, model) {
        if (err) {
          return callback(err);
        }

        if (!model['default']) { // not default room in group, code robustness
          read.can_delete = true;
          return callback(null);
        }
        read.can_delete = (model.default.toString() !== room.id);
        return callback(null);
      });
    },

    function more (callback) {
      if (what.more !== true) {
        return callback(null);
      }

      read.avatar = room._avatar();
      read.poster = room._poster();
      read.color = room.color;
      read.website = room.website;
      read.topic = room.topic;
      read.description = room.description;
      read.disclaimer = room.disclaimer;
      read.created = room.created_at;

      return callback(null);
    },

    function admin (callback) {
      if (what.admin !== true) {
        return callback(null);
      }
      if (session.settings.admin !== true && !room.isOwner(user.id)) {
        return callback(null);
      }

      read.password = room.password;

      if (session.settings.admin === true) {
        read.visibility = room.visibility || false;
        read.priority = room.priority || 0;
      }

      return callback(null);
    },

    function users (callback) {
      if (what.users !== true) {
        return callback(null);
      }

      RoomModel.populate(room, [
        { path: 'op', select: 'username avatar color facebook' },
        { path: 'users', select: 'username avatar color facebook' },
        { path: 'bans.user', select: 'username avatar color facebook' },
        { path: 'devoices.user', select: 'username avatar color facebook' }
      ], function (err) {
        if (err) {
          return callback(err);
        }

        var decorate = function (u) {
          return {
            user_id: u.id,
            username: u.username,
            avatar: u._avatar(),
            color: u.color
          };
        };

        var max = 42;
        read.users = [];
        read.users_count = room.users.length;
        read.users_more = false;

        var alreadyIn = [];

        if (room.owner) {
          var owner = decorate(room.owner);
          owner.is_owner = true;
          alreadyIn.push(room.owner.id);
          read.users.push(owner);
        }

        _.each(room.op, function (u) {
          var op = decorate(u);
          op.is_op = true;
          alreadyIn.push(u.id);
          read.users.push(op);
        });

        // pad list to 'max' users
        _.find(room.users, function (u) {
          if (alreadyIn.indexOf(u.id) !== -1) {
            return; // continue iteration
          }
          if (read.users.length === max) {
            read.users_more = true;
            return true; // stop iteration
          }

          read.users.push(decorate(u));

          if (read.users.length > max) {
            return true; // stop iteration
          }
        });

        return callback(null);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:read', next)(err);
    }

    return next(null, read);
  });
};
