var async = require('async');
var _ = require('underscore');
var UserModel = require('../models/user');
var RoomModel = require('../models/room');
var GroupModel = require('../models/group');
var diacritics = require('diacritics').remove;
var common = require('@dbrugne/donut-common/server');

/**
 * Search in database rooms, groups and/or users.
 *
 * @param search
 * @param options : object {
 *    users: boolean // wether to search in users or not
 *    rooms: boolean // wether to search in rooms or not
 *    groups: boolean // wether to search in groups or not
 *    limit: integer // limit the number of results
 *    skip: {
 *      users: integer, // nb of users results to skip
 *      rooms: integer, // nb of rooms results to skip
 *      groups: integer, // nb of groups results to skip
 *    } // skip some results, for pagination purpose
 *    sort: {  } // change sort order by this one if defined
 *    group_name // when looking for rooms, name of the group, optional
 *    public_rooms: boolean // if true, fetch only public rooms of 'group_name', else fetch all rooms
 *    light: boolean // juste fetch minimal informations
 *    criteria // if required to apply specific criterias on search
 * }
 * @param callback
 *
 * @return {
 *  users: {
 *    list: [],
 *    count: integer
 *  },
 *  rooms: {
 *    list: [],
 *    count: integer
 *  },
 *  groups: {
 *    list: [],
 *    count: integer
 *  }
 * }
 */
module.exports = function (search, options, callback) {
  // remove diacritic, @ and #
  search = search.replace(/([@#])/g, '');
  search = diacritics(search);

  var _regexp = common.regexp.contains(search);

  var users = [];
  var rooms = [];
  var groups = [];

  var limit = options.limit || 100;
  var criteria = options.criteria || {};

  var searchResults = {};

  async.waterfall([

    // search for groups by name
    function groupSearch (callback) {
      if (!options.groups) {
        return callback(null);
      }

      searchResults.groups = {
        list: [],
        count: 0
      };
      criteria.name = _regexp;
      criteria.deleted = {$ne: true};

      GroupModel.count(criteria, function (err, count) {
        if (err) {
          return callback(err);
        }
        searchResults.groups.count = count;

        // @todo yls add lastjoin_at when #896 is done
        var q = GroupModel.find(criteria, 'name owner avatar color members op') // @todo yls removed 'disclaimer'
        if (options.skip && options.skip.groups) {
          q.skip(options.skip.groups);
        }
        q.limit(limit);
        q.populate('owner', 'username');
        q.exec(function (err, dbgroups) {
          if (err) {
            return callback(err);
          }

          groups = dbgroups;

          return callback(null);
        });
      });
    },

    // search for rooms inside a group
    function getGroupId (callback) {
      if (!options.rooms || !options.group_name) {
        return callback(null, null);
      }

      GroupModel.findByName(options.group_name).exec(function (err, model) {
        if (err || !model) {
          return callback(err, null);
        }

        return callback(null, model._id);
      });
    },

    // when looking for rooms, eventually inside a group
    function roomSearch (groupId, callback) {
      if (!options.rooms) {
        return callback(null);
      }

      searchResults.rooms = {
        list: [],
        count: 0
      };
      criteria.name = _regexp;
      criteria.deleted = {$ne: true};

      // if group is defined, only search rooms inside that group
      if (groupId) {
        criteria.group = {$eq: groupId};
        if (options.public_rooms) {
          criteria.mode = {$eq: 'public'};
        }
        if (search === '') { //empty search, list all rooms of a group
          delete criteria.name;
        }
      }

      RoomModel.count(criteria, function (err, count) {
        if (err) {
          return callback(err);
        }
        searchResults.rooms.count = count;

        var q;
        if (!options.light) {
          q = RoomModel.find(criteria, 'name owner group description topic avatar color users lastjoin_at mode');
          q.sort({'lastjoin_at': -1});
          if (options.skip && options.skip.rooms) {
            q.skip(options.skip.rooms);
          }
          q.limit(limit);
          q.populate('owner', 'username');
          q.populate('group', 'name avatar color');
        } else {
          q = RoomModel.find(criteria, 'name group avatar color lastjoin_at mode');
          q.sort({'lastjoin_at': -1});
          if (options.skip && options.skip.rooms) {
            q.skip(options.skip.rooms);
          }
          q.limit(limit);
          q.populate('group', 'name avatar color');
        }
        q.exec(function (err, dbrooms) {
          if (err) {
            return callback(err);
          }

          rooms = dbrooms;

          return callback(null);
        });
      });
    },

    function userSearch (callback) {
      if (!options.users) {
        return callback(false);
      }

      searchResults.users = {
        list: [],
        count: 0
      };
      criteria.username = _regexp;

      UserModel.count(criteria, function (err, count) {
        if (err) {
          return callback(err);
        }
        searchResults.users.count = count;

        var q = UserModel.find(criteria, 'username avatar color facebook bio');
        q.sort(options.sort || {'lastonline_at': -1, 'lastoffline_at': -1});
        if (options.skip && options.skip.users) {
          q.skip(options.skip.users);
        }
        q.limit(limit);
        q.exec(function (err, dbusers) {
          if (err) {
            return callback(err);
          }

          users = dbusers;

          return callback(null);
        });
      });
    },

    function computeResults (callback) {
      if (options.rooms && rooms.length > 0) {
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

          if (!options.light) {
            r.description = room.description;
            r.topic = room.topic;
            r.users = count;
            if (room.owner) {
              r.owner_id = room.owner.id;
              r.owner_username = room.owner.username;
            }
          }

          searchResults.rooms.list.push(r);
        });

        // sort (users, lastjoin_at, name)
        searchResults.rooms.list.sort(function (a, b) {
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

          if (a.lastjoin_at !== b.lastjoin_at) {
            // b - a == descending
            return (b.lastjoin_at - a.lastjoin_at);
          }

          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
      }

      if (options.groups && groups.length > 0) {
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

          if (group.owner) {
            _data.owner_id = group.owner.id;
            _data.owner_username = group.owner.username;
          }

          searchResults.groups.list.push(_data);
        });

        // sort (members, name)
        searchResults.groups.list.sort(function (a, b) {
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }

          if ((a.members + a.op) !== (b.members + b.op)) {
            // b - a == descending
            return ((b.members + b.op) - (a.members + a.op));
          }

          if (a.avatar && !b.avatar) {
            return -1;
          } else if (!a.avatar && b.avatar) {
            return 1;
          }

          // @todo yls uncomment when #896 is done
          // if (a.lastjoin_at !== b.lastjoin_at) {
          //   // b - a == descending
          //   return (b.lastjoin_at - a.lastjoin_at);
          // }

          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
      }

      if (options.users && users.length > 0) {
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

          searchResults.users.list.push(r);
        });
      }

      return callback(null);
    }
  ], function (err) {
    if (err) {
      return callback(err);
    }

    return callback(null, searchResults);
  });
};
