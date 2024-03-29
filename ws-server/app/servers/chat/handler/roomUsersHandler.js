'use strict';
var errors = require('../../../util/errors');
var User = require('../../../../../shared/models/user');
var async = require('async');
var _ = require('underscore');
var common = require('@dbrugne/donut-common/server');

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

  var _searchTypes = [
    'all',              // users + ban
    'users',            // users
    'op',               // op + owner
    'allowed',          // allowed
    'allowedPending',   // allowed pending
    'regular',          // users (not op/owner/ban/devoice)
    'ban',              // ban
    'devoice'           // devoice
  ];

  var _searchTypesThatNeedPower = ['allowed', 'allowedPending', 'ban', 'devoice'];

  var _statusTypes = [
    'online',           // only online users
    'offline',          // only offline users
    'onoff'             // all online + some offline
  ];

  /**
   * @param room_id (@mandatory)
   * @param attributes (@mandatory)
   * {
   *   type: select the type of search (@mandatory)
   *   searchString: string to match
   *   selector:
   *   {
   *      start: index to start
   *      length: number of result
   *   }
   *   status: (online, offline or onoff)
   *   maxOffline: (in case of onoff search, max offline users to send to client)
   * }
   * @returns users, count
   */

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('params-room-id');
      }

      if (!data.attributes) {
        return callback('params');
      }

      if (!data.attributes.type) {
        return callback('params');
      }

      if (_searchTypes.indexOf(data.attributes.type) === -1) {
        return callback('not-found');
      }

      if (data.attributes.type === 'allowed' && room.mode !== 'private') {
        return callback('cannot make an allowed search on a no-allowed room');
      }

      if (data.attributes.type === 'regular' && room.mode === 'private') {
        return callback('cannot make a regular search on an allowed room');
      }

      if (data.attributes.status && _statusTypes.indexOf(data.attributes.status) === -1) {
        return callback('not-found');
      }

      if ((_searchTypesThatNeedPower.indexOf(data.attributes.type) !== -1) &&
      !room.isOwnerOrOp(user.id) && !user.admin) {
        return callback('not-found');
      }

      if (!room) {
        return callback('room-not-found');
      }

      if (!room.isIn(user.id) && !room.isOwnerOrOp(user.id) && !user.admin) {
        return callback('not-in');
      }

      return callback(null);
    },

    function selectIds (callback) {
      var ids = room.getIdsByType(data.attributes.type);
      return callback(null, ids);
    },

    function selectByStatus (ids, callback) {
      if (!data.attributes.status) {
        return callback(null, ids);
      }

      that.app.statusService.getStatusByUids(ids, function (err, results) {
        if (err) {
          return callback(err);
        }
        var idsTmp = [];

        // max offline users send in case of an onoff search
        var _maxOffline = data.attributes.maxOffline || 15;

        _.each(ids, function (id) {
          if ((results[id] && data.attributes.status === 'online') ||
            (!(results[id]) && data.attributes.status === 'offline') ||
            (results[id] && data.attributes.status === 'onoff') ||
            (!(results[id]) && data.attributes.status === 'onoff' && (_maxOffline-- > 0))) {
            idsTmp.push(id);
          }
        });
        return callback(null, idsTmp);
      });
    },

    function prepareQuery (ids, callback) {
      var query = {
        _id: { $in: ids }
      };
      if (data.attributes.searchString) {
        var regex = common.regexp.contains(data.attributes.searchString, 'i');
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
          realname: u.realname,
          avatar: u._avatar(),
          isBanned: room.isBanned(u.id),
          isDevoiced: room.isDevoice(u.id),
          isOp: room.isOp(u.id),
          isOwner: room.isOwner(u.id),
          isPending: room.isAllowedPending(u.id)
        };
        if (data.attributes.type === 'allowedPending') {
          var pend = room.getAllowPendingByUid(u._id.toString());
          userData.date = pend.created_at;
          userData.name = (u.name) ? u.name : u.facebook.name;
          userData.mail = (u.local.email) ? u.local.email : u.facebook.email;
          if (pend.message) {
            userData.message = pend.message;
          }
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
      return errors.getHandler('room:users', next)(err);
    }

    return next(null, {
      users: users,
      count: count // number of users that match the search
    });
  });
};
