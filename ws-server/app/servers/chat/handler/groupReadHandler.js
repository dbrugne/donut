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
  var what = data.what || {};

  var alreadyIn = [];

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
      read = {
        identifier: '#' + group.name,
        name: group.name,
        group_id: group.id,
        avatar: group._avatar(),
        color: group.color,
        website: group.website,
        description: group.description,
        disclaimer: group.disclaimer,
        created: group.created_at,
        members: []
      };

      // owner
      if (group.owner) {
        read.owner_id = group.owner.id;
        read.owner_username = group.owner.username;
      }

      return callback(null);
    },

    function admin (callback) {
      if (what.admin !== true) {
        return callback(null);
      }

      if (group.isOwner(user.id) || session.settings.admin === true) {
        read.password = group.password;
        read.allowed_domains = group.allowed_domains;
      }

      if (session.settings.admin === true) {
        read.visibility = group.visibility || false;
        read.priority = group.priority || 0;
      }
      read.allow_user_request = group.allow_user_request;
      return callback(null);
    },

    function users (callback) {
      if (what.users !== true) {
        return callback(null);
      }

      // owner
      if (group.owner) {
        var owner = {
          user_id: group.owner.id,
          username: group.owner.username,
          avatar: group.owner._avatar(),
          color: group.owner.color,
          is_owner: true
        };
        read.members.push(owner);
        alreadyIn.push(group.owner.id);
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
          read.members.push(el);
          alreadyIn.push(el.user_id);
        });
      }

      var max = 60;
      read.members_count = group.members.length;
      read.members_more = false;

      // pad list to 'max' users
      if (group.members && group.members.length > 0) {
        _.find(group.members, function (u) {
          if (alreadyIn.indexOf(u.id) !== -1) {
            return;
          }
          if (read.members.length === max) {
            read.members_more = true;
            return true; // stop iteration
          }
          var el = {
            user_id: u.id,
            username: u.username,
            avatar: u._avatar(),
            color: u.color
          };
          read.members.push(el);

          if (read.members.length > max) {
            return true; // stop iteration
          }
        });
      }

      read.bans = [];
      if (group.bans && group.bans.length > 0) {
        _.each(group.bans, function (ban) {
          var el = {
            user_id: ban.user.id,
            username: ban.user.username,
            avatar: ban.user._avatar(),
            color: ban.user.color,
            banned_at: ban.banned_at,
            reason: ban.reason
          };
          read.bans.push(el);
        });
      }

      return callback(null);
    },

    function rooms (callback) {
      if (what.rooms !== true) {
        return callback(null);
      }

      RoomModel.findByGroup(group._id)
        .populate({
          path: 'owner',
          select: 'username avatar color facebook'
        })
        .populate('allowed')
        .exec(function (err, rooms) {
          if (err) {
            return callback(err);
          }
          var sanitizedRooms = [];
          _.each(rooms, function (r) {
            var allowed = _.find(r.get('allowed'), function (u) {
              return u.id === user.id;
            });
            if (r.mode !== 'public' && !group.isMember(user.id) && session.settings.admin !== true && !allowed) {
              return;
            }

            var room = {
              name: r.name,
              identifier: '#' + group.name + '/' + r.name,
              room_id: r.id,
              id: r.id,
              avatar: r._avatar(),
              poster: r._poster(),
              mode: r.mode,
              color: r.color,
              description: r.description,
              users: (r.users)
                ? r.users.length
                : 0
            };

            if (r.mode !== 'public') {
              room.allow_user_request = r.allow_user_request;
              room.allow_group_member = r.allow_group_member;
            }

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
