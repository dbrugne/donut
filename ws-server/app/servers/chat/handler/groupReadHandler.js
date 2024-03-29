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
  var that = this;

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
        default: group.default,
        group_id: group.id,
        avatar: group._avatar(),
        website: group.website,
        description: group.description,
        disclaimer: group.disclaimer,
        created: group.created_at,
        members: [],
        last_event_at: group.last_event_at,
        is_member: group.isMember(user.id),
        is_op: group.isOp(user.id),
        is_owner: group.isOwner(user.id)
      };

      var banned = group.isInBanned(user.id);
      if (typeof banned !== 'undefined') {
        read.i_am_banned = true;
        read.blocked = true;
        read.banned_at = banned.banned_at;
        read.reason = banned.reason;
      }

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
        read.allow_user_request = group.allow_user_request;
      }

      if (session.settings.admin === true) {
        read.visibility = group.visibility || false;
        read.priority = group.priority || 0;
      }

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
          realname: group.owner.realname,
          bio: group.owner.bio,
          location: group.owner.location,
          avatar: group.owner._avatar(),
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
            realname: op.realname,
            bio: op.bio,
            location: op.location,
            avatar: op._avatar(),
            is_op: true
          };
          read.members.push(el);
          alreadyIn.push(el.user_id);
        });
      }

      var max = 60;
      read.members_count = group.members.length + 1; // + 1 to add owner
      read.members_more = false;

      // only display members to allowed users
      if (group.isMember(user.id) || group.isOwner(user.id) || group.isMember(user.id) || session.settings.admin === true) {
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
              realname: u.realname,
              username: u.username,
              location: u.location,
              bio: u.bio,
              avatar: u._avatar()
            };
            read.members.push(el);

            if (read.members.length > max) {
              return true; // stop iteration
            }
          });
        }
      }

      var ids = _.map(read.members, 'user_id');
      that.app.statusService.getStatusByUids(ids, function (err, results) {
        if (err) {
          return callback(err);
        }
        _.each(read.members, function (element, index, list) {
          list[index].status = (results[element.user_id])
            ? 'online'
            : 'offline';
        });
        return callback(null);
      });
    },

    function rooms (callback) {
      if (what.rooms !== true) {
        return callback(null);
      }

      var decorateRoomUser = function (r, room) {
        // user_is_op
        room.is_op = r.isOp(user.id);
        // user_is_owner
        room.is_owner = r.isOwner(user.id);
        // user_is_devoice
        room.is_devoice = r.isDevoice(user.id);
        // user_is_banned
        room.is_banned = r.isBanned(user.id);
      };

      RoomModel.findByGroup(group._id)
        .populate({
          path: 'owner',
          select: 'username avatar facebook'
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
                is_owner: true
              };
            }

            decorateRoomUser(r, room);

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
