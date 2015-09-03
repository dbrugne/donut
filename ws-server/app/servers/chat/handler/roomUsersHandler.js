'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');

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

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('room_id is mandatory');
      }

      if (!data.type) {
        return callback('type is mandatory');
      }

      if (['all', 'op', 'allowed', 'ban', 'devoice'].indexOf(data.type) === -1) {
        return callback('search type ' + data.type + 'don\'t exist');
      }

      if (!room) {
        return callback('unable to retrieve room: ' + data.room_id);
      }

      var roomUser = _.findIndex(room.users, function (u) {
        return (u.id === user.id);
      });
      if (roomUser === -1) {
        return callback('this user ' + user.id + ' is not currently in ' + room.name);
      }

      return callback(null);
    },

    function listAndStatus (callback) {
      var usersIds = [];
      var users = [];

      users = _.map(_.filter(room.users, function (u) {
        if ((data.type === 'op' && room.isOwnerOrOp(u.id)) ||
          (data.type === 'allowed' && room.isAllowed(u.id)) ||
          (data.type === 'all')) {
          if ((data.searchString && u.username && u.username.indexOf(data.searchString) !== -1) ||
          !data.searchString) {
            usersIds.push(u.id);
            return (u);
          }
        }
      }), function (u) {
        return {
          user_id: u.id,
          username: u.username,
          avatar: u._avatar()
        };
      });

      if (data.type === 'ban' && room.bans && room.bans.length > 0) {
        _.each(room.bans, function (ban) {
          if ((data.searchString && ban.username && ban.username.indexOf(data.searchString) !== -1) ||
            !data.searchString) {
            usersIds.push(ban.user.id);
            users.push({
              user_id: ban.user.id,
              username: ban.user.username,
              avatar: ban.user._avatar(),
              banned_at: ban.banned_at,
              reason: ban.reason
            });
          }
        });
      } else if (data.type === 'devoice' && room.devoices && room.devoices.length > 0) {
        _.each(room.devoices, function (devoice) {
          if ((data.searchString && devoice.username && devoice.username.indexOf(data.searchString) !== -1) ||
            !data.searchString) {
            usersIds.push(devoice.user.id);
            users.push({
              user_id: devoice.user.id,
              username: devoice.user.username,
              avatar: devoice.user._avatar(),
              devoiced_at: devoice.devoiced_at,
              reason: devoice.reason
            });
          }
        });
      }
      that.app.statusService.getStatusByUids(usersIds, function (err, results) {
        if (err) {
          return callback(err);
        }
        _.each(users, function (element, index, list) {
          list[index].status = (results[element.user_id]) ?
            'online' :
            'offline';
        });
        return callback(null, users);
      });
    }

  ], function (err, users) {
    if (err) {
      logger.error('[room:users] ' + err);
      return next(null, {code: 500, err: err});
    }

    return next(null, {
      room_id: room.id,
      users: users
    });
  });

};
