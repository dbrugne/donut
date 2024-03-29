'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var RoomModel = require('../../../../../shared/models/room');
var GroupModel = require('../../../../../shared/models/group');
var conf = require('../../../../../config/index');
var common = require('@dbrugne/donut-common/server');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;

  async.waterfall([

    function check (callback) {
      if (!data.group_name) {
        return callback('params-name');
      }

      if (!common.validate.group(data.group_name)) {
        return callback('name-wrong-format');
      }

      if (user.confirmed === false) {
        return callback('not-confirmed');
      }

      return callback(null);
    },

    function createGroup (callback) {
      RoomModel.findByNameAndGroup(data.group_name, null).exec(function (err, room) {
        if (err) {
          return callback(err);
        }
        if (room) {
          return callback('room-already-exist');
        }

        var r = GroupModel.findByName(data.group_name);
        r.exec(function (err, group) {
          if (err) {
            return callback(err);
          }
          if (group) {
            return callback('group-name-already-exist');
          }

          group = GroupModel.getNewGroup();
          group.name = data.group_name;
          group.owner = user.id;

          group.save(function (err) {
            return callback(err, group);
          });
        });
      });
    },

    function createWelcome (group, callback) {
      var room = RoomModel.getNewRoom();
      room.name = conf.group.default.name;
      room.owner = user.id;
      room.mode = 'public';
      room.group = group.id;
      room.users.addToSet(user._id);
      room.allowed.addToSet(user._id);

      room.save(function (err) {
        return callback(err, group, room);
      });
    },

    function persistOnGroup (group, room, callback) {
      group.default = room._id;
      group.save(function (err) {
        return callback(err, group, room);
      });
    }
  ], function (err) {
    if (err) {
      return errors.getHandler('group:create', next)(err);
    }

    return next(null, {success: true});
  });
};
