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
  var group = session.__group__;

  var that = this;

  var searchTypes = [
    'members',          // members + owner
    'pending',          // members_pending
    'op',               // op + owner
    'regular',          // members (not op/owner)
    'banned'            // banned members
  ];

  var searchTypesThatNeedPower = [];

  /**
   * @param group_id (@mandatory)
   * @param attributes (@mandatory)
   * {
   *   type: select the type of search (@mandatory)
   *   searchString: string to match
   *   selector:
   *   {
   *      start: index to start
   *      length: number of result
   *   }
   *   status: (online or offline)
   * }
   * @returns users, count
   */

  async.waterfall([

    function check (callback) {
      if (!data.group_id) {
        return callback('params-group-id');
      }

      if (!group) {
        return callback('group-not-found');
      }

      if (!data.attributes) {
        return callback('params');
      }

      if (!data.attributes.type) {
        return callback('params');
      }

      if (searchTypes.indexOf(data.attributes.type) === -1) {
        return callback('not-found');
      }

      if (data.attributes.status && data.attributes.status !== 'online' && data.attributes.status !== 'offline') {
        return callback('not-found');
      }

      if ((searchTypesThatNeedPower.indexOf(data.attributes.type) !== -1) &&
        !group.isOwner(user.id) && !user.admin) {
        return callback('not-found');
      }

      return callback(null);
    },

    function selectIds (callback) {
      var ids = group.getIdsByType(data.attributes.type);
      return callback(null, ids);
    },

    function selectByStatus (ids, callback) {
      if (data.attributes.status !== 'online' && data.attributes.status !== 'offline') {
        return callback(null, ids);
      }

      that.app.statusService.getStatusByUids(ids, function (err, results) {
        if (err) {
          return callback(err);
        }
        var idsTmp = [];
        _.each(ids, function (id) {
          if ((results[id] && data.attributes.status === 'online') ||
            (!(results[id]) && data.attributes.status === 'offline')) {
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
          avatar: u._avatar(),
          isOp: group.isOp(u.id),
          isOwner: group.isOwner(u.id),
          isPending: group.isAllowedPending(u.id)
        };
        if (data.attributes.type === 'pending') {
          var pend = group.getAllowPendingByUid(u._id.toString());
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
      return errors.getHandler('group:users', next)(err);
    }

    return next(null, {
      users: users,
      count: count // number of users that match the search
    });
  });
};
