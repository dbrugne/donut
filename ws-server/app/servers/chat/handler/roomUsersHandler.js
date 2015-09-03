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

      // filter by type
      users = _.filter(room.users, function (u) {
        if ((data.type === 'op' && room.isOwnerOrOp(u.id)) ||
          (data.type === 'allowed' && room.isAllowed(u.id)) ||
          (data.type === 'all')) {
          return (u);
        }
      });

      // filter by type
      if (!users[0] && (data.type === 'devoice' || data.type === 'ban')) {
        var key;

        if (data.type === 'devoice') {
          key = room.devoices;
        } else {
          key = room.bans;
        }
        users = _.filter(key, function (type) {
            return (type.user);
          });
      }

      // filter by search string
      users = _.filter(users, function (u) {
        if ((data.searchString && u.username && u.username.indexOf(data.searchString) !== -1) ||
          !data.searchString) {
          usersIds.push(u.id);
          return (u);
        }
      });

      // filter by selector
      if (data.selector) {
        var usersTmp = [];
        _.each(users, function (u, index) {
          if (index >= data.selector.start && index < data.selector.start + data.selector.length) {
            usersTmp.push(u);
          }
          if (index > data.selector.start + data.selector.length) {
            return;
          }
        });
        users = usersTmp;
      }

      // Set values
      users = _.map(users, function (u) {
        var userData = {
          user_id: u.id,
          username: u.username,
          avatar: u._avatar()
        };
        return userData;
      });

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
      room_name: room.name,
      users: users,
      owner_name: room.owner.username,
      owner_id: room.owner._id
    });
  });

};
