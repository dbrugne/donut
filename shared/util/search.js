var async = require('async');
var _ = require('underscore');
var User = require('../models/user');
var Room = require('../models/room');
var diacritic2ascii = require('./diacritic2ascii');
var common = require('@dbrugne/donut-common');

/**
 * Search in database rooms and/or users.
 * Results is returned as:
 *
 * {
 *   users: {
 *     list: [{}]
 *     more: Boolean
 *   },
 *   rooms: {
 *     list: [{}]
 *     more: Boolean
 *   }
 * }
 *
 * @param search
 * @param searchInUsers
 * @param searchInRooms
 * @param limit
 * @param lightSearch
 * @param callback
 */
module.exports = function (search, searchInUsers, searchInRooms, limit, lightSearch, callback) {

  if (!search) {
    return callback(null, {});
  }

  // remove diacritic, @ and #
  search = search.replace(/([@#])/g, '');
  search = diacritic2ascii(search);
  if (!search || search === '') {
    return callback(null, {});
  }
  var _regexp = common.regExpBuildContains(search);

  async.parallel([

    function roomSearch (callback) {
      if (!searchInRooms) {
        return callback(null, false);
      }

      var criteria = {
        name: _regexp,
        deleted: { $ne: true }
      };

      var q;
      if (!lightSearch) {
        q = Room
          .find(criteria, 'name owner description topic avatar color users lastjoin_at')
          .sort({'lastjoin_at': -1})
          .limit(limit + 1)
          .populate('owner', 'username');
      } else {
        q = Room
          .find(criteria, 'name avatar color lastjoin_at')
          .sort({'lastjoin_at': -1})
          .limit(limit + 1);
      }
      q.exec(function (err, rooms) {
        if (err) {
          return callback(err);
        }

        var results = [];
        _.each(rooms, function (room) {
          var owner = {};
          if (room.owner) {
            owner = {
              user_id: room.owner.id,
              username: room.owner.username
            };
          }

          var count = (room.users) ?
            room.users.length :
            0;

          var r = {
            name: room.name,
            room_id: room.id,
            avatar: room._avatar(),
            color: room.color,
            lastjoin_at: new Date(room.lastjoin_at).getTime()
          };

          if (!lightSearch) {
            r.owner = owner;
            r.description = room.description;
            r.topic = room.topic;
            r.users = count;
          }

          results.push(r);
        });

        // sort (users, lastjoin_at, name)
        results.sort(function (a, b) {
          if (a.users !== b.users) {
            // b - a == descending
            return (b.users - a.users);
          }

          if (a.lastjoin_at !== b.lastjoin_at) {
            // b - a == descending
            return (b.lastjoin_at - a.lastjoin_at);
          }

          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });

        return callback(null, results);
      });
    },

    function userSearch (callback) {
      if (!searchInUsers) {
        return callback(null, false);
      }

      var criteria = {
        username: _regexp
      };

      var q = User.find(criteria, 'username avatar color facebook bio');
      q.sort({'lastonline_at': -1, 'lastoffline_at': -1})
        .limit(limit + 1);
      q.exec(function (err, users) {
        if (err) {
          return callback(err);
        }

        var list = [];
        _.each(users, function (user) {
          var r = {
            user_id: user.id,
            username: user.username,
            avatar: user._avatar(),
            color: user.color,
            bio: user.bio
          };

          list.push(r);
        });

        return callback(null, list);
      });
    }

  ], function (err, results) {
    if (err) {
      return callback(err);
    }

    var searchResults = {};
    if (results[0] !== false) {
      if (results[0].length > limit) {
        results[0].pop();
        searchResults.rooms = {
          list: results[0],
          more: true
        };
      } else {
        searchResults.rooms = {
          list: results[0],
          more: false
        };
      }
    }
    if (results[1] !== false) {
      if (results[1].length > limit) {
        results[1].pop();
        searchResults.users = {
          list: results[1],
          more: true
        };
      } else {
        searchResults.users = {
          list: results[1],
          more: false
        };
      }
    }

    return callback(null, searchResults);
  });
};