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
      if (!data.name) {
        return callback('params-name');
      }

      if (!common.validate.group(data.name)) {
        return callback('name-wrong-format');
      }

      return callback(null);
    },

    function createGroup (callback) {
      var q = RoomModel.findByName(data.name);
      q.exec(function (err, room) {
        if (err) {
          return callback(err);
        }
        if (room) {
          return callback('group-name-already-exist');
        }
      });

      var r = GroupModel.findByName(data.name);
      r.exec(function (err, group) {
        if (err) {
          return callback(err);
        }
        if (group) {
          return callback('group-name-already-exist');
        }

        group = GroupModel.getNewGroup();
        group.name = data.name;
        group.owner = user.id;
        group.color = conf.room.default.color;
        group.visibility = false; // not visible on home until admin change this value
        group.priority = 0;

        group.save(function (err) {
          return callback(err, group);
        });
      });
    },

    function createWelcome (group, callback) {
      var room = RoomModel.getNewRoom();
      room.name = 'welcome';
      room.permanent = true;
      room.group = group.id;
      room.owner = user.id;
      room.color = conf.room.default.color;
      room.visibility = false; // not visible on home until admin change this value
      room.priority = 0;

      room.save(function (err) {
        return callback(err, room);
      });
    }
  ], function (err) {
    if (err) {
      return errors.getHandler('group:create', next)(err);
    }

    return next(null, {success: true});
  });
};
