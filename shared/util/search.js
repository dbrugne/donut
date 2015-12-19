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
 *    group_name // when looking for rooms or users, name of the group, optional
 *    user_id: integer // Id of the user who triggered the search, optional, used when looking for specific rooms
 *    light: boolean // just fetch minimal information
 *    starts: boolean // look for search at the begining of the searched field
 *    app: {Pomelo app instance}
 * }
 * @param callback
 *
 * @return {
 *  users: { list: [], more: boolean },
 *  rooms: { list: [], more: boolean },
 *  groups: { list: [], more: boolean },
 * }
 */
module.exports = function (search, options, callback) {
  // whitelist allowed options
  options = _.pick(options, [
    'users',
    'rooms',
    'groups',
    'limit',
    'skip',
    'group_name',
    'light',
    'starts',
    'app'
  ]);

  // remove diacritic, @ and #
  search = search.replace(/([@#])/g, '');
  search = diacritics(search);

  var _regexp;
  if (search) {
    _regexp = (options.starts === true)
      ? common.regexp.starts(search)
      : common.regexp.contains(search);
  }

  var users = [];
  var rooms = [];
  var groups = [];
  var statuses;

  var limit = options.limit || {users: 25, groups: 25, rooms: 25};

  var searchResults = {
    users: {
      list: [],
      more: false
    },
    rooms: {
      list: [],
      more: false
    },
    groups: {
      list: [],
      more: false
    }
  };

  async.waterfall([

    // search for groups by name
    function groupSearch (callback) {
      if (!options.groups) {
        return callback(null);
      }

      var criteria = {deleted: {$ne: true}};
      if (_regexp) {
        criteria.name = _regexp;
      }

      var q = GroupModel.find(criteria, 'name owner avatar color members op last_event_at description');
      if (options.skip && options.skip.groups) {
        q.skip(options.skip.groups);
      }
      if (limit.groups) {
        q.limit(limit.groups + 1); // look for one more to handle "more" logic
      }
      q.sort('-last_event_at -members avatar name');
      q.populate('owner', 'username');
      q.exec(function (err, dbgroups) {
        if (err) {
          return callback(err);
        }

        if (limit.groups && dbgroups.length === (limit.groups + 1)) {
          searchResults.groups.more = true;
          dbgroups.pop(); // remove last one
        }

        groups = dbgroups;

        return callback(null);
      });
    },

    // search for rooms inside a group
    function getGroupId (callback) {
      if ((!options.rooms || !options.users) && !options.group_name) {
        return callback(null, null);
      }

      GroupModel.findByName(options.group_name).exec(callback);
    },

    // when looking for rooms, eventually inside a group
    function roomSearch (group, callback) {
      if (!options.rooms) {
        return callback(null, null);
      }

      var criteria = {deleted: {$ne: true}};
      if (_regexp) {
        criteria.name = _regexp;
      }

      // if group is defined, only search rooms inside that group
      if (group) {
        criteria.group = {$eq: group._id};

        if (!(options.user_id && group.isMember(options.user_id))) {
          criteria.mode = {$eq: 'public'};
        }
      }

      var select = (options.light)
        ? 'name group avatar color last_event_at mode'
        : 'name owner group description avatar color users last_event_at mode';

      var q = RoomModel.find(criteria, select)
        .sort('-last_event_at -users avatar name');

      if (options.skip && options.skip.rooms) {
        q.skip(options.skip.rooms);
      }
      if (limit.rooms) {
        q.limit(limit.rooms + 1); // handle "more" logic
      }

      q.populate('group', 'name avatar color')
      if (!options.light) {
        q.populate('owner', 'username');
      }

      q.exec(function (err, dbrooms) {
        if (err) {
          return callback(err);
        }

        if (limit.rooms && dbrooms.length === (limit.rooms + 1)) {
          searchResults.rooms.more = true;
          dbrooms.pop(); // remove last one
        }

        rooms = dbrooms;

        return callback(null, group);
      });
    },

    function userSearch (group, callback) {
      if (!options.users) {
        return callback(false);
      }

      var criteria = {deleted: {$ne: true}};
      if (_regexp) {
        criteria.username = _regexp;
      }

      var q = UserModel.find(criteria, 'username realname avatar color facebook bio ones location');
      q.sort('-lastonline_at -lastoffline_at -avatar username');
      if (options.skip && options.skip.users) {
        q.skip(options.skip.users);
      }
      if (limit.users) {
        q.limit(limit.users + 1); // handle "more" logic
      }
      q.populate('ones', 'last_event_at');
      q.populate('ones.user', 'id');
      q.exec(function (err, dbusers) {
        if (err) {
          return callback(err);
        }

        if (limit.users && dbusers.length === (limit.users + 1)) {
          searchResults.users.more = true;
          dbusers.pop(); // remove last one
        }

        users = dbusers;

        return callback(null);
      });
    },

    function decorateUserStatus (callback) {
      if (!options.users || !users.length || !options.app) {
        return callback(null);
      }

      var usersId = _.map(users, 'id');
      options.app.statusService.getStatusByUids(usersId, function (err, results) {
        if (err) {
          return callback(err);
        }

        statuses = results;
        return callback(null);
      });
    },

    function computeResults (callback) {
      if (options.rooms && rooms.length > 0) {
        _.each(rooms, function (room) {
          var r = {
            type: 'room',
            room_id: room.id,
            name: room.name,
            identifier: room.getIdentifier(),
            avatar: room._avatar(),
            color: room.color,
            mode: room.mode
          };

          if (room.group) {
            r.group_id = room.group.id;
            r.group_name = room.group.name;
            r.group_avatar = room.group._avatar();
          }

          if (!options.light) {
            r.description = room.description;
            r.topic = room.topic;
            r.users = (room.users)
              ? room.users.length
              : 0;
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
          var _data = {
            type: 'group',
            name: group.name,
            identifier: group.getIdentifier(),
            group_id: group.id,
            description: group.description,
            color: group.color,
            avatar: group._avatar(),
            users: group.count()
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
            realname: user.realname,
            location: user.location,
            avatar: user._avatar(),
            color: user.color,
            bio: user.bio
          };
          if (statuses) {
            r.status = (statuses[user.id] === true)
              ? 'online'
              : 'offline';
          }
          if (options.user_id) {
            var a = _.find(user.get('ones'), function (item) {
              return item.user.id === options.user_id;
            });
            r.last_event_at = a && a.last_event_at
              ? a.last_event_at
              : null;
          }

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
