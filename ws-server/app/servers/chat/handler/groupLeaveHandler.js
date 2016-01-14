'use strict';
var _ = require('underscore');
var errors = require('../../../util/errors');
var async = require('async');
var RoomModel = require('../../../../../shared/models/room');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var group = session.__group__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.group_id) {
        return callback('params-group-id');
      }

      if (!group) {
        return callback('group-not-found');
      }

      return callback(null);
    },

    function checkIfUserNotInRoomsOfTheGroup (callback) {
      RoomModel.findByGroup(group.id)
        .exec(function (err, rooms) {
          if (err) {
            return callback(err);
          }
          var findInOneRoom = _.find(rooms, function (r) {
            return (r.isIn(user.id));
          });
          if (findInOneRoom) {
            return callback('not-allowed');
          }
          return callback(null);
        });
    },

    function persistOnUser (callback) {
      user.groups.pull(group.id);
      user.save(function (err) {
        return callback(err);
      });
    },

    function broadcastToUser (callback) {
      var event = {
        group_id: group.id,
        group_name: '#' + group.name,
        reason: 'quit'
      };
      that.app.globalChannelService.pushMessage('connector', 'group:leave', event, 'user:' + user.id, {}, function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:leave', next)(err);
    }

    return next(null, {success: true});
  });
};
