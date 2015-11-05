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

  var limit = options.limit || 100;
  var criteria = options.criteria || {};

  var searchResults = {
    users: {
      list: [],
      count: 0
    },
    rooms: {
      list: [],
      count: 0
    },
    groups: {
      list: [],
      count: 0
    }
  };

  async.waterfall([

    // search for groups by name
    function groupSearch (callback) {
      if (!options.groups) {
        return callback(null);
      }

      criteria.name = _regexp;
      criteria.deleted = {$ne: true};

      GroupModel.count(criteria, function (err, count) {
        if (err) {
          return callback(err);
        }
        searchResults.groups.count = count;

        // @todo yls add lastactivity_at when #896 is done
        var q = GroupModel.find(criteria, 'name owner avatar color members op priority');
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
      if ((!options.rooms || !options.users) && !options.group_name) {
        return callback(null, null);
      }

      GroupModel.find({name: options.group_name})
        .populate('members')
        .populate('op')
        .populate('owner')
        .exec(function (err, models) {
          if (err || !models || models.length === 0) {
            return callback(err, null);
          }

          return callback(null, models.pop());
        });
    },

    // when looking for rooms, eventually inside a group
    function roomSearch (group, callback) {
      if (!options.rooms) {
        return callback(null, null);
      }

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
          q = RoomModel.find(criteria, 'name owner group description topic avatar color users lastjoin_at mode priority');
          q.sort({'lastjoin_at': -1});
          if (options.skip && options.skip.rooms) {
            q.skip(options.skip.rooms);
          }
          q.limit(limit);
          q.populate('owner', 'username');
          q.populate('group', 'name avatar color');
        } else {
          q = RoomModel.find(criteria, 'name group avatar color lastjoin_at mode priority');
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

          return callback(null, group);
        });
      });
    },

    function userSearch (group, callback) {
      if (!options.users) {
        return callback(false);
      }

      // @todo yls implement search on group members / op when required, based on group id
      // GroupModel.find( members.name / op.name === str ) . populate ...

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
            lastjoin_at: new Date(room.lastjoin_at).getTime(),
            priority: room.priority || 0
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

        if (!options.mix) {
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

        if (!options.mix) {
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
            // if (a.lastactivity_at !== b.lastactivity_at) {
            //   // b - a == descending
            //   return (b.lastactivity_at - a.lastactivity_at);
            // }

            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          });
        }
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

      if (options.mix) {
        searchResults.all = {
          list: _.union(searchResults.users.list, searchResults.rooms.list, searchResults.groups.list)
        };

        searchResults.all.list.sort(function (a, b) {
          // order by last_activity, descending
          if (a.lastactivity_at && b.lastactivity_at && (a.lastactivity_at !== b.lastactivity_at)) {
            return (b.lastactivity_at - a.lastactivity_at);
          }

          // order by priority (admin), descending
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
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

          // order by lastjoin_at
          if (a.lastjoin_at && b.lastjoin_at && (a.lastjoin_at !== b.lastjoin_at)) {
            return (b.lastjoin_at - a.lastjoin_at);
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
