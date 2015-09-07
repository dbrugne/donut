'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var diacritic2ascii = require('../../../../../shared/util/diacritic2ascii');
var common = require('@dbrugne/donut-common');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var that = this;

  if (!data.search) {
    return;
  }

  var searchInRooms = (data.rooms && data.rooms === true);
  var searchInUsers = (data.users && data.users === true);
  if (!searchInRooms && !searchInUsers) {
    return;
  }

  var lightSearch = (data.light && data.light === true);

  var limit = (data.limit) ?
    data.limit :
    150;

  // remove diacritic, @ and #
  var search = data.search;
  search = search.replace(/([@#])/g, '');
  search = diacritic2ascii(search);
  var _regexp = common.regExpBuildContains(search);

  async.parallel([

    function roomSearch (callback) {
      if (!searchInRooms) {
        return callback(null, false);
      }

      var search = {
        name: _regexp,
        deleted: {$ne: true}
      };

      var q;
      if (!lightSearch) {
        q = Room
          .find(search, 'name owner description topic avatar color users lastjoin_at')
          .sort({'lastjoin_at': -1})
          .limit(limit + 1)
          .populate('owner', 'username');
      } else {
        q = Room
          .find(search, 'name avatar color lastjoin_at')
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
          if (room.owner !== undefined) {
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

      var search = {
        username: _regexp
      };

      var q = User.find(search, 'username avatar color facebook bio');
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

        if (lightSearch) {
          return callback(null, list);
        } else {
          var uids = _.map(list, function (u) {
            return u.user_id;
          });
          that.app.statusService.getStatusByUids(uids, function (err, results) {
            if (err) {
              return callback(err);
            }

            _.each(list, function (element, index, _list) {
              _list[index].status = (results[element.user_id]) ?
                'online' :
                'offline';
            });

            return callback(null, list);
          });
        }
      });
    }

  ], function (err, results) {
    if (err) {
      logger('[search] ' + err);
      return next(null, {code: 500, err: err});
    }

    var event = {};
    if (results[0] !== false) {
      if (results[0].length > limit) {
        results[0].pop();
        event.rooms = {
          list: results[0],
          more: true
        };
      } else {
        event.rooms = {
          list: results[0],
          more: false
        };
      }
    }
    if (results[1] !== false) {
      if (results[1].length > limit) {
        results[1].pop();
        event.users = {
          list: results[1],
          more: true
        };
      } else {
        event.users = {
          list: results[1],
          more: false
        };
      }
    }

    return next(null, event);
  });
};
