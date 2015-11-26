'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
var Room = require('../../../../../shared/models/room');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var readUser = session.__user__;

  var read = {};
  var what = data.what || {};

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.user_id && !data.username) {
        return callback('params-username-user-id');
      }

      if (!readUser) {
        return callback('user-not-found');
      }

      return callback(null);
    },

    function details (callback) {
      read.user_id = readUser.id;
      read.realname = readUser.realname;
      read.username = readUser.username;
      read.color = readUser.color;
      read.avatar = readUser._avatar();
      read.banned = user.isBanned(readUser.id); // for ban/deban menu
      read.i_am_banned = readUser.isBanned(user.id); // for input enable/disable

      if (what.more) {
        read.poster = readUser._poster();
        read.bio = readUser.bio;
        read.location = readUser.location;
        read.website = readUser.website;
        read.registered = readUser.created_at;
      }

      return callback(null);
    },

    function status (callback) {
      that.app.statusService.getStatusByUid(readUser.id, function (err, status) {
        if (err) {
          return callback(err);
        }

        if (status) {
          read.status = 'online';
          read.onlined = user.lastonline_at;
        } else {
          read.status = 'offline';
          user.onlined = user.lastoffline_at;
        }
        return callback(null);
      });
    },

    function rooms (callback) {
      if (!what.rooms) {
        return callback(null);
      }

      Room.find({
        deleted: {$ne: true},
        $or: [
          {owner: readUser._id},
          {op: {$in: [readUser._id]}},
          {users: {$in: [readUser._id]}}
        ]
      }, 'name avatar color owner op users group')
        .populate('group', 'name')
        .exec(function (err, models) {
          if (err) {
            return callback(err);
          }

          read.rooms = {
            owned: [],
            oped: [],
            joined: []
          };
          _.each(models, function (room) {
            var _room = {
              name: room.name,
              identifier: room.getIdentifier(),
              id: room.id,
              avatar: room._avatar(),
              color: room.color
            };

            if (room.owner && room.owner.toString() === readUser.id) {
              read.rooms.owned.push(_room);
            } else if (room.op.length && room.op.indexOf(readUser._id) !== -1) {
              read.rooms.oped.push(_room);
            } else {
              read.rooms.joined.push(_room);
            }
          });

          return callback(null);
        });
    },

    function account (callback) {
      if (!what.admin || readUser.id !== user.id) {
        return callback(null);
      }

      read.account = {};

      // email
      if (readUser.local && readUser.local.email) {
        read.account.email = readUser.local.email;
      }

      // emails
      if (readUser.emails && readUser.emails.length > 0) {
        var emails = [];
        _.each(readUser.emails, function (e) {
          var mail = {email: e.email, confirmed: e.confirmed};
          if (readUser.local && readUser.local.email === e.email) {
            mail.main = true;
          }
          if (readUser.facebook && readUser.facebook.id && readUser.facebook.email === e.email) {
            mail.facebook = true;
          }
          emails.push(mail);
        });
        read.account.emails = emails;
      }

      // password
      read.account.has_password = (readUser.local && readUser.local.password);

      // facebook
      if (readUser.facebook && readUser.facebook.id) {
        read.account.facebook = {
          id: readUser.facebook.id,
          token: (readUser.facebook.token)
            ? 'yes'
            : '',
          email: readUser.facebook.email,
          name: readUser.facebook.name
        };
      }
      return callback(null);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('user:read', next)(err);
    }

    return next(null, read);
  });
};
