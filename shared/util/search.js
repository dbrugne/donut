var async = require('async');
var _ = require('underscore');
var User = require('../models/user');
var Room = require('../models/room');
var Group = require('../models/group');
var diacritics = require('diacritics').remove;
var common = require('@dbrugne/donut-common/server');

/**
 * Search in database rooms, groups and/or users.
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
 *   },
 *   groups: {
 *    list: [{}],
 *    more: Boolean
 *   }
 * }
 *
 * @param search
 * @param searchInUsers
 * @param searchInRooms
 * @param searchWithGroups
 * @param limit
 * @param skip
 * @param lightSearch
 * @param privateGroupRooms
 * @param callback
 */
module.exports = function (search, searchInUsers, searchInRooms, searchWithGroups, limit, skip, lightSearch, privateGroupRooms, callback) {
  // remove diacritic, @ and #
  search = search.replace(/([@#])/g, '');
  search = diacritics(search);

  var _regexp = common.regexp.contains(search);
  var rooms = [];
  var groups = [];
  var roomResults = [];
  var groupResults = [];
  var userResults = [];

  async.waterfall([

    function groupSearch (callback) {
      if (!searchInRooms || !searchWithGroups) {
        return callback(null);
      }

      var criteria = {
        name: searchWithGroups
          ? common.regexp.contains(diacritics(searchWithGroups.replace(/([@#])/g, '')))
          : _regexp,
        deleted: {$ne: true}
      };

      Group.find(criteria, 'name owner disclaimer avatar color members op')
        .skip(skip)
        .limit(limit)
        .populate('owner', 'username')
        .exec(function (err, dbgroups) {
          if (err) {
            return callback(err);
          }

          groups = dbgroups;

          return callback(null);
        });
    },

    function getGroupId (callback) {
      if (!searchWithGroups) {
        return callback(null, null);
      }

      Group.findByName(searchWithGroups).exec(function (err, model) {
        if (err || !model) {
          return callback(err, null);
        }

        return callback(null, model._id);
      });
    },

    function roomSearch (groupId, callback) {
      if (!searchInRooms) {
        return callback(null);
      }

      var criteria = {
        name: _regexp,
        deleted: {$ne: true}
      };

      if (groupId) {
        criteria.group = {$eq: groupId};
      }

      var q;
      if (!lightSearch) {
        q = Room
          .find(criteria, 'name owner group description topic avatar color users lastjoin_at mode')
          .sort({'lastjoin_at': -1})
          .skip(skip)
          .limit(limit)
          .populate('owner', 'username')
          .populate('group', 'name avatar color');
      } else {
        q = Room
          .find(criteria, 'name group avatar color lastjoin_at mode')
          .sort({'lastjoin_at': -1})
          .skip(skip)
          .limit(limit)
          .populate('group', 'name avatar color');
      }
      q.exec(function (err, dbrooms) {
        if (err) {
          return callback(err);
        }

        if (!privateGroupRooms) {
          var tmpRooms = [];
          _.each(dbrooms, function (r) {
            if (!r.group || (r.group && r.mode === 'public')) {
              tmpRooms.push(r);
            }
          });
          rooms = tmpRooms;
        } else {
          rooms = dbrooms;
        }

        return callback(null);
      });
    },

    function computeResults (callback) {
      _.each(rooms, function (room) {
        var count = (room.users)
          ? room.users.length
          : 0;

        var r = {
          type: 'room',
          room_id: room.id,
          name: room.name,
          identifier: room.getIdentifier(),
          avatar: room._avatar(),
          color: room.color,
          mode: room.mode,
          lastjoin_at: new Date(room.lastjoin_at).getTime()
        };

        if (room.group) {
          r.group_id = room.group.id;
          r.group_name = room.group.name;
          r.group_avatar = room.group._avatar();
        }

        if (!lightSearch) {
          r.description = room.description;
          r.topic = room.topic;
          r.users = count;
          if (room.owner !== undefined) {
            r.owner_id = room.owner.id;
            r.owner_username = room.owner.username;
          }
        }

        roomResults.push(r);
      });

      _.each(groups, function (group) {
        var count = group.count();

        var _data = {
          type: 'group',
          name: group.name,
          identifier: group.getIdentifier(),
          group_id: group.id,
          disclaimer: group.disclaimer,
          color: group.color,
          avatar: group._avatar(),
          users: count,
          priority: group.priority || 0
        };

        if (group.owner !== undefined) {
          _data.owner_id = group.owner.id;
          _data.owner_username = group.owner.username;
        }

        groupResults.push(_data);
      });

      // sort (users, lastjoin_at, name)
      roomResults.sort(function (a, b) {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }

        if (a.users !== b.users) {
          // b - a == descending
          return (b.users - a.users);
        }

        if (a.avatar && !b.avatar) {
          return -1;
        } else if (!a.avatar && b.avatar) {
          return 1;
        }

        if (a.type !== 'group' && b.type !== 'group' && a.lastjoin_at !== b.lastjoin_at) {
          // b - a == descending
          return (b.lastjoin_at - a.lastjoin_at);
        }

        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });

      return callback(null);
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
        .limit(limit);
      q.exec(function (err, users) {
        if (err) {
          return callback(err);
        }

        _.each(users, function (user) {
          var r = {
            type: 'user',
            user_id: user.id,
            username: user.username,
            location: user.location,
            avatar: user._avatar(),
            color: user.color,
            bio: user.bio
          };

          userResults.push(r);
        });

        return callback(null);
      });
    }

  ], function (err) {
    if (err) {
      return callback(err);
    }

    // @todo yls prioriser entre rooms / users / groups

    var searchResults = {
      users: {
        list: userResults,
        more: userResults.length >= limit
      },
      rooms: {
        list: roomResults,
        more: roomResults.length >= limit
      },
      groups: {
        list: groupResults,
        more: groupResults.length >= limit
      }
    };

    return callback(null, searchResults);
  });
};
