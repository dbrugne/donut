'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename);
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
        return callback('room_id or name is mandtory');
      }

      if (!room) {
        return callback('unknown');
      }

      return callback(null);
    },

    function prepare (callback) {
      var users = [];
      var alreadyIn = [];

      // owner
      var owner = {};
      if (room.owner) {
        owner = {
          user_id: room.owner.id,
          username: room.owner.username,
          avatar: room.owner._avatar(),
          color: room.owner.color,
          is_owner: true
        };
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

      read = {
        name: room.name,
        id: room.id,
        room_id: room.id,
        owner: owner,
        users: users,
        avatar: room._avatar(),
        poster: room._poster(),
        color: room.color,
        website: room.website,
        topic: room.topic,
        description: room.description,
        created: room.created_at,
        mode: room.mode
      };

      if (room.isOwner(user.id) || session.settings.admin === true) {
        read.password = room.password;
      }

      if (session.settings.admin === true) {
        read.visibility = room.visibility || false;
        read.priority = room.priority || 0;
      }

      return callback(null);
    }

  ], function (err) {
    if (err) {
      logger.error('[room:read] ' + err);

      switch (err) {
        case 'invalid-name':
          return next(null, {code: 400, err: err});
        case 'unknown':
          return next(null, {code: 404, err: err});
        default:
          return next(null, {code: 500, err: 'internal'});
      }
    }

    return next(null, read);
  });
};
