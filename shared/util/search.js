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
 *    limit: {
 *      users: integer, // nb of users results max
 *      rooms: integer, // nb of rooms results max
 *      groups: integer, // nb of groups results max
 *    } // limit the number of results
 *    skip: {
 *      users: integer, // nb of users results to skip
 *      rooms: integer, // nb of rooms results to skip
 *      groups: integer, // nb of groups results to skip
 *    } // skip some results, for pagination purpose
 *    sort: {  } // change sort order by this one if defined
 *    group_name // when looking for rooms or users, name of the group, optional
 *    user_id: integer // Id of the user who triggered the search, optional, used  when looking for specific rooms
 *    light: boolean // juste fetch minimal informations
 *    criteria // if required to apply specific criterias on search
 *    mix: boolean // if results needs to be merged and ordered
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
 *  },
 *  all: {
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

  var limit = options.limit || {  // @todo : to 25 (here and on client side)
    users: 100,
    groups: 100,
    rooms: 100
  };

  var searchResults = {
    users: {
      list: [],
      count: 0 // @todo : useless?
    },
    rooms: {
      list: [],
      count: 0 // @todo : useless?
    },
    groups: {
      list: [],
      count: 0 // @todo : useless?
    }
  };

  // @todo : add a .more logic (get limit + 1 ...)

  async.waterfall([

    // search for groups by name
    function groupSearch (callback) {
      if (!options.groups) {
        return callback(null);
      }

      var criteria = options.criteria || {};
      criteria.name = _regexp;
      criteria.deleted = {$ne: true};

      GroupModel.count(criteria, function (err, count) {
        if (err) {
          return callback(err);
        }
        searchResults.groups.count = count;

        var q = GroupModel.find(criteria, 'name owner avatar color members op lastactivity_at description');
        if (options.skip && options.skip.groups) {
          q.skip(options.skip.groups);
        }
        if (limit.groups) {
          q.limit(limit.groups);
        }
        q.sort(options.sort || '-lastactivity_at -members avatar name');
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
      if ((!options.rooms || !options.users) && !options.group_name) {
        return callback(null, null);
      }

      GroupModel.find({name: options.group_name})// @todo : why searching on name? (and case sensitivity?)
        .populate('members') // @todo why?
        .populate('op') // @todo why?
        .populate('owner')
        .exec(function (err, models) {
          if (err || !models || models.length === 0) {
            return callback(err, null);
          }

          return callback(null, models.pop()); // @todo : pop() ?
        });
    },

    // when looking for rooms, eventually inside a group
    function roomSearch (group, callback) {
      if (!options.rooms) {
        return callback(null, null);
      }

      var criteria = options.criteria || {};
      criteria.name = _regexp;
      criteria.deleted = {$ne: true};

      // if group is defined, only search rooms inside that group
      if (group) {
        criteria.group = {$eq: group._id};
        // no user_id defined (landing) only search in public rooms of specified group
        var allowedUsers = _.union(group.get('members'), group.get('op'), [group.owner]);
        if (!options.user_id || (!_.find(allowedUsers,
            function (user) {
              return options.user_id === user.id;
            }))) {
          criteria.mode = {$eq: 'public'};
        }
        if (search === '') { // empty search, list all rooms of a group
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
          q = RoomModel.find(criteria, 'name owner group description topic avatar color users lastjoin_at lastactivity_at mode');
          q.sort(options.sort || '-lastactivity_at -lastjoin_at -users avatar name');
          if (options.skip && options.skip.rooms) {
            q.skip(options.skip.rooms);
          }
          if (limit.rooms) {
            q.limit(limit.rooms);
          }
          q.populate('owner', 'username');
          q.populate('group', 'name avatar color');
        } else {
          q = RoomModel.find(criteria, 'name group avatar color lastjoin_at lastactivity_at mode');
          q.sort(options.sort || '-lastactivity_at -lastjoin_at avatar name');
          if (options.skip && options.skip.rooms) {
            q.skip(options.skip.rooms);
          }
          if (limit.rooms) {
            q.limit(limit.rooms);
          }
          q.populate('group', 'name avatar color');
        }
        q.exec(function (err, dbrooms) {
          if (err) {
            return callback(err);
          }

          rooms = dbrooms;

          return callback(null, group);
        });
      });
    },

    function userSearch (group, callback) {
      if (!options.users) {
        return callback(false);
      }

      var criteria = options.criteria || {};
      criteria.username = _regexp;

      UserModel.count(criteria, function (err, count) {
        if (err) {
          return callback(err);
        }
        searchResults.users.count = count;

        var q = UserModel.find(criteria, 'username avatar color facebook bio ones location');
        q.sort(options.sort || '-lastonline_at -lastoffline_at -avatar username');
        if (options.skip && options.skip.users) {
          q.skip(options.skip.users);
        }
        if (limit.users) {
          q.limit(limit.users);
        }
        q.populate('ones', 'lastactivity_at');
        q.populate('ones.user', 'id');
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
      }

      if (options.groups && groups.length > 0) {
        _.each(groups, function (group) {
          var count = group.count();

          var _data = {
            type: 'group',
            name: group.name,
            identifier: group.getIdentifier(),
            group_id: group.id,
            description: group.description,
            color: group.color,
            avatar: group._avatar(),
            users: count
          };

          if (group.owner) {
            _data.owner_id = group.owner.id;
            _data.owner_username = group.owner.username;
          }

          searchResults.groups.list.push(_data);
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
          if (options.user_id) {
            var a = _.find(user.get('ones'), function (item) {
              return item.user.id === options.user_id;
            });
            r.lastactivity_at = a && a.lastactivity_at ? a.lastactivity_at : null;
          }

          searchResults.users.list.push(r);
        });
      }

      if (options.mix) {
        searchResults.all = {
          list: _.union(searchResults.users.list, searchResults.rooms.list, searchResults.groups.list)
        };

        searchResults.all.list.sort(function (a, b) {
          // order by last_activity, descending
          if (a.lastactivity_at !== b.lastactivity_at) {
            return (b.lastactivity_at - a.lastactivity_at);
          }

          // order by lastjoin_at
          if (a.lastjoin_at && b.lastjoin_at && (a.lastjoin_at !== b.lastjoin_at)) {
            return (b.lastjoin_at - a.lastjoin_at);
          }

          // order by nb users / nb members
          var aCount = a.users
            ? a.users.length
            : a.members
            ? a.members.length + a.op.length
            : 0;
          var bCount = b.users
            ? b.users.length
            : b.members
            ? b.members.length + b.op.length
            : 0;
          if (aCount !== bCount) {
            // b - a == descending
            return (bCount - aCount);
          }

          // order by avatar
          if (a.avatar && !b.avatar) {
            return -1;
          } else if (!a.avatar && b.avatar) {
            return 1;
          }

          // finally order by name
          var aName = a.name
            ? a.name
            : a.username
            ? a.username
            : '';
          var bName = b.name
            ? b.name
            : b.username
            ? b.username
            : '';
          return aName.toLowerCase().localeCompare(bName.toLowerCase());
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
