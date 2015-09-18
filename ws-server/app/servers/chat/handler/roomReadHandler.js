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
      // owner
      var owner = {};
      if (room.owner) {
        owner = {
          user_id: room.owner._id,
          username: room.owner.username,
          avatar: room.owner._avatar()
        };
      }

      // op
      var ops = [];
      if (room.op && room.op.length > 0) {
        _.each(room.op, function (op) {
          ops.push({
            user_id: op.id,
            username: op.username,
            avatar: op._avatar()
          });
        });
      }

      // ban
      var bans = [];
      if (room.bans && room.bans.length > 0) {
        _.each(room.bans, function (ban) {
          bans.push({
            user_id: ban.user.id,
            username: ban.user.username,
            avatar: ban.user._avatar(),
            banned_at: ban.banned_at,
            reason: ban.reason
          });
        });
      }

      // devoices
      var devoices = [];
      if (room.devoices && room.devoices.length) {
        _.each(room.devoices, function (devoice) {
          devoices.push({
            user_id: devoice.user.id,
            username: devoice.user.username,
            avatar: devoice.user._avatar(),
            devoiced_at: devoice.devoiced_at,
            reason: devoice.reason
          });
        });
      }

      // users
      var users = [];
      if (room.users && room.users.length > 0) {
        _.each(room.users, function (u) {
          users.push({
            user_id: u.id,
            username: u.username,
            avatar: u._avatar()
          });
        });
      }

      read = {
        name: room.name,
        id: room.id,
        room_id: room.id,
        owner: owner,
        op: ops,
        bans: bans,
        devoices: devoices,
        users: users,
        avatar: room._avatar(),
        poster: room._poster(),
        color: room.color,
        website: room.website,
        topic: room.topic,
        description: room.description,
        created: room.created_at,
        mode: room.mode,
        has_password: !!room.password
      };

      if (session.settings.admin === true) {
        read.visibility = room.visibility || false;
        read.priority = room.priority || 0;
        // @todo : pass current password to admin only
      }

      return callback(null);
    }

  ], function (err) {
    if (err) {
      logger.error('[room:read] ' + err);

      err = (['invalid-name', 'unknown'].indexOf(err) !== -1)
        ? err
        : 'internal';
      return next(null, {code: 500, err: 'internal'});
    }

    return next(null, read);
  });
};
