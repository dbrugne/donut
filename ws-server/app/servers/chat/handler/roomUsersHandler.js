'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var User = require('../../../../../shared/models/user');
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

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('room_id is mandatory');
      }

      if (!data.type) {
        return callback('type is mandatory');
      }

      if (['all', 'op', 'allowed', 'ban', 'devoice'].indexOf(data.type) === -1) {
        return callback('search type ' + data.type + 'don\'t exist');
      }

      if (!room) {
        return callback('unable to retrieve room: ' + data.room_id);
      }

      if (!room.isIn(user.id)) {
        return callback('this user ' + user.id + ' is not currently in ' + room.name);
      }

      return callback(null);
    },

    function selectIds (callback) {
      var ids = room.getIdsByType(data.type);
      return callback(null, ids);
    },

    function prepareQuery (ids, callback) {
      var query = {
        _id: { $in: ids }
      };
      if (data.searchString) {
        query.username = {$regex: data.searchString};
      }
      return callback(null, query);
    },

    function query (query, callback) {
      User.searchUsers(query, data.selector).exec(function (err, users) {
        if (err) {
          return callback(err);
        }
        return callback(null, query, users);
      });
    },

    function queryCount (query, users, callback) {
      User.queryCount(query).exec(function (err, count) {
        if (err) {
          return callback(err);
        }
        return callback(null, users, count);
      });
    },

    function listAndStatus (users, count, callback) {
      // Set values
      users = _.map(users, function (u) {
        var userData = {
          user_id: u._id,
          username: u.username,
          avatar: u._avatar(),
          access: '-',
          isBanned: false,
          isDevoiced: false
        };
        if (room.isOp(u.id)) {
          userData.access = 'op';
        } else if (room.isOwner(u.id)) {
          userData.access = 'owner';
        }
        if (room.isBanned(u.id)) {
          userData.isBanned = true;
        }
        if (room.isDevoice(u.id)) {
          userData.isDevoiced = true;
        }
        return userData;
      });
      var ids = _.map(users, 'user_id');
      that.app.statusService.getStatusByUids(ids, function (err, results) {
        if (err) {
          return callback(err);
        }
        _.each(users, function (element, index, list) {
          list[index].status = (results[element.user_id])
            ? 'online'
            : 'offline';
        });
        return callback(null, users, count);
      });
    }

  ], function (err, users, count) {
    if (err) {
      logger.error('[room:users] ' + err);
      return next(null, {code: 500, err: err});
    }

    return next(null, {
      users: users,
      nbUsers: count // number of users that match who search
    });
  });
};
