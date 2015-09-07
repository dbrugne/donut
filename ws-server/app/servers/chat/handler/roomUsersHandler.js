'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var User = require('../../../../../shared/models/user');
var async = require('async');
var _ = require('underscore');
var common = require('@dbrugne/donut-common');

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

  var searchTypes = ['all', 'users', 'op', 'allowed', 'regular', 'ban', 'devoice'];

  var searchTypesThatNeedPower = ['allowed', 'ban', 'devoice'];

  /* **************************
  all: users + ban
  users: users
  op: op + owner
  allowed: allowed
  regular: users (not op/owner/ban/devoice)
  ban: ban
  devoice: devoice
  ************************** */

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('room_id is mandatory');
      }

      if (!data.attributes.type) {
        return callback('attributes.type is mandatory');
      }

      if (searchTypes.indexOf(data.attributes.type) === -1) {
        return callback('search type \'' + data.type + '\' don\'t exist');
      }

      if (data.attributes.type === 'allowed' && room.join_mode !== 'allowed') {
        return callback('cannot make an allowed search on a no-allowed room');
      }

      if (data.attributes.type === 'regular' && room.join_mode === 'allowed') {
        return callback('cannot make a regular search on an allowed room');
      }

      if ((searchTypesThatNeedPower.indexOf(data.attributes.type) !== -1) &&
      !room.isOwnerOrOp(user.id) && !user.admin) {
        return callback('this user ' + user.id + ' is not allowed to perform this type of search : ' + data.attributes.type);
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
      var ids = room.getIdsByType(data.attributes.type);
      return callback(null, ids);
    },

    function prepareQuery (ids, callback) {
      var query = {
        _id: { $in: ids }
      };
      if (data.attributes.searchString) {
        var regex = common.regExpBuildContains(data.attributes.searchString, 'i');
        query.username = {$regex: regex};
      }
      return callback(null, query);
    },

    function query (query, callback) {
      if (!data.attributes.selector) {
        data.attributes.selector = {start: 0, length: 0};
      }
      User.find(query)
        .sort({username: 1})
        .skip(data.attributes.selector.start)
        .limit(data.attributes.selector.length)
        .exec(function (err, users) {
          return callback(err, query, users);
        });
    },

    function queryCount (query, users, callback) {
      User.find(query)
        .count()
        .exec(function (err, count) {
          return callback(err, users, count);
        });
    },

    function listAndStatus (users, count, callback) {
      // Set values
      users = _.map(users, function (u) {
        var userData = {
          user_id: u._id,
          username: u.username,
          avatar: u._avatar(),
          isBanned: room.isBanned(u.id),
          isDevoiced: room.isDevoice(u.id),
          isOp: room.isOp(u.id),
          isOwner: room.isOwner(u.id)
        };
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
      count: count // number of users that match the search
    });
  });
};
