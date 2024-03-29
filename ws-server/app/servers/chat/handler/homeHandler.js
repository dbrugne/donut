'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var Group = require('../../../../../shared/models/group');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var homeEvent = {
    users: {},
    rooms: {}
  };
  var roomLimit = (session.settings.device === 'mobile')
    ? 100
    : 100;
  var userLimit = 200;

  var rooms = [];
  var roomsInGroups = [];
  var groups = [];
  var users = [];

  var that = this;

  // @todo yls : fix this horrible mess!
  async.waterfall(
    [
      function roomsFetch (callback) {
        var q = Room.find({
          visibility: true,
          deleted: {$ne: true}
        })
          .sort({priority: -1, 'last_event_at': -1})
          .limit(roomLimit + 1)
          .populate('group', 'name avatar')
          .populate('owner', 'username avatar');

        q.exec(function (err, dbrooms) {
          if (err) {
            return callback('Error while retrieving home rooms: ' + err);
          }

          var tmpRooms = [];
          _.each(dbrooms, function (r) { // remove private rooms in group
            if (!r.group || (r.group && r.mode === 'public')) {
              tmpRooms.push(r);
            }
          });
          rooms = tmpRooms;

          return callback(null);
        });
      },

      function groupsFetch (callback) {
        var q = Group.find({
          visibility: true,
          deleted: {$ne: true}
        })
          .sort({priority: -1})
          .limit(roomLimit + 1)
          .populate('owner', 'username avatar');

        q.exec(function (err, dbgroups) {
          if (err) {
            return callback('Error while retrieving home groups: ' + err);
          }

          groups = dbgroups;
          async.eachLimit(dbgroups, 10, function (group, fn) {
            var criteria = {deleted: {$ne: true}, group: group._id};
            var query = Room.find(criteria, 'avatar identifier name group');
            query.populate('group', 'name');
            query.sort('-last_event_at');
            query.exec(function (err, rooms) {
              if (err) {
                return fn(err);
              }

              roomsInGroups[group.name] = rooms;
              return fn(null);
            });
          }, function (err) {
            return callback(err);
          });

          return callback(null);
        });
      },

      function usersFetch (callback) {
        if (session.settings.device === 'mobile') {
          return callback(null);
        }

        var q = User.find({username: {$ne: null}}, 'username avatar facebook location');
        q.sort({'lastonline_at': -1, 'lastoffline_at': -1})
          .limit(userLimit);

        q.exec(function (err, dbusers) {
          if (err) {
            return callback('Error while retrieving users list: ' + err);
          }

          users = dbusers;

          return callback(null);
        });
      },

      function userStatus (callback) {
        if (session.settings.device === 'mobile') {
          return callback(null);
        }

        var list = [];
        _.each(users, function (u, index) {
          list.push({
            type: 'user',
            user_id: u.id,
            username: u.username,
            location: u.location,
            avatar: u._avatar(),
            sort: index
          });
        });

        var uids = _.map(users, function (u) {
          return u.user_id;
        });
        that.app.statusService.getStatusByUids(uids, function (err, results) {
          if (err) {
            return callback('Error while retrieving user status: ' + err);
          }

          _.each(users, function (element, index, list) {
            list[index].status = (results[element.user_id])
              ? 'online'
              : 'offline';
            list[index].sort = ((results[element.user_id])
                ? 0
                : 1) + '' + list[index].sort;
          });

          users = _.sortBy(users, 'sort');

          if (users.length > userLimit) {
            users.pop();
            homeEvent.users.more = true;
          } else {
            homeEvent.users.more = false;
          }
          homeEvent.users.list = list;
          return callback(null);
        });
      },

      function computeResults (callback) {
        var _list = [];
        _.each(rooms, function (room) {
          var count = (room.users)
            ? room.users.length
            : 0;

          var _data = {
            type: 'room',
            name: room.name,
            identifier: room.getIdentifier(),
            mode: room.mode,
            room_id: room.id,
            topic: room.topic,
            description: room.description,
            avatar: room._avatar(),
            users: count,
            last_event_at: new Date(room.last_event_at).getTime(),
            priority: room.priority || 0
          };

          if (room.owner) {
            _data.owner_id = room.owner.id;
            _data.owner_username = room.owner.username;
          }

          if (room.group) {
            _data.group_id = room.group.id;
            _data.group_name = room.group.name;
            _data.group_avatar = room.group._avatar();
          }

          _list.push(_data);
        });

        _.each(groups, function (group) {
          var count = group.count();
          var _roomsData = [];
          _.each(roomsInGroups[group.name], function (r) {
            _roomsData.push({
              avatar: r._avatar(),
              identifier: r.getIdentifier(),
              room_id: r._id
            });
          });

          var _data = {
            type: 'group',
            name: group.name,
            identifier: group.getIdentifier(),
            group_id: group.id,
            disclaimer: group.disclaimer,
            description: group.description,
            avatar: group._avatar(),
            users: count,
            priority: group.priority || 0,
            rooms: _roomsData
          };

          if (group.owner !== undefined) {
            _data.owner_id = group.owner.id;
            _data.owner_username = group.owner.username;
          }

          _list.push(_data);
        });

        // sort (priority, users, last_event_at, name)
        _list.sort(function (a, b) {
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }

          if (a.users !== b.users) {
            return (b.users - a.users);
          } // b - a == descending

          if (a.avatar && !b.avatar) {
            return -1;
          } else if (!a.avatar && b.avatar) {
            return 1;
          }

          if (a.type !== 'group' && b.type !== 'group' && a.last_event_at !== b.last_event_at) {
            return (b.last_event_at - a.last_event_at);
          } // b - a == descending

          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });

        if (_list.length > roomLimit) {
          _list = _list.slice(0, (roomLimit - 1));
          homeEvent.rooms.more = true;
        } else {
          homeEvent.rooms.more = false;
        }
        homeEvent.rooms.list = _list;

        return callback(null);
      }
    ],
    function (err) {
      if (err) {
        return errors.getHandler('home', next)(err);
      }
      return next(null, homeEvent);
    }
  );
};
