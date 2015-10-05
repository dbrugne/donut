'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
var RoomModel = require('../../../../../shared/models/room');

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
  var members = [];
  var alreadyIn = [];

  var what = data.what;

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

    function basic (callback) {
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

      return callback(null);
    },

    function users (callback) {
      if (what.users !== true) {
        return callback(null);
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
          if (u.id === group.owner.user_id || alreadyIn.indexOf(u.id) !== -1) {
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

      return callback(null);
    },

    function admin (callback) {
      if (what.admin !== true) {
        return callback(null);
      }

      if (group.isOwner(user.id) || session.settings.admin === true) {
        read.password = group.password;
      }

      if (session.settings.admin === true) {
        read.visibility = group.visibility || false;
        read.priority = group.priority || 0;
      }

      return callback(null);
    },

    function rooms (callback) {
      if (what.rooms !== true) {
        return callback(null);
      }

      RoomModel.findByGroup(group._id).populate({
        path: 'owner',
        select: 'username avatar color facebook'
      }).exec(function (err, rooms) {
        if (err) {
          return callback(err);
        }
        var sanitizedRooms = [];
        _.each(rooms, function (r) {
          var room = {
            id: r.id,
            room_id: r.id,
            avatar: r._avatar(),
            poster: r._poster(),
            mode: r.mode,
            color: r.color,
            name: r.name,
            description: r.description
          };

          if (r.owner) {
            room.owner = {
              user_id: r.owner.id,
              username: r.owner.username,
              avatar: r.owner._avatar(),
              color: r.owner.color,
              is_owner: true
            };
          }

          sanitizedRooms.push(room);
        });

        read.rooms = sanitizedRooms;
        return callback(null);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:read', next)(err);
    }

    return next(null, read);
  });
};
