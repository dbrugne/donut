'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var RoomModel = require('../../../../../shared/models/room');
var conf = require('../../../../../config/index');
var keenio = require('../../../../../shared/io/keenio');
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
      if (!data.room_name) {
        return callback('params-name');
      }

      if (!common.validate.name(data.room_name)) {
        return callback('name-wrong-format');
      }

      if (!data.mode) {
        return callback('params-mode');
      }

      if (!common.validate.mode(data.mode)) {
        return callback('mode-wrong-format');
      }

      return callback(null);
    },

    function create (callback) {
      var q = RoomModel.findByName(data.room_name);
      q.exec(function (err, room) {
        if (err) {
          return callback(err);
        }
        if (room) {
          return callback('room-already-exist');
        }

        room = RoomModel.getNewRoom();
        room.name = data.room_name;
        room.owner = user.id;
        room.color = conf.room.default.color;
        room.visibility = false; // not visible on home until admin change this value
        room.priority = 0;
        room.mode = data.mode;
        if (data.mode === 'private' && data.password !== null) {
          room.password = data.password; // user.generateHash(data.password);
        }

        room.save(function (err) {
          return callback(err, room);
        });
      });
    },

    function setPreferencesOnOwner (room, callback) {
      user.set('preferences.room:notif:roomjoin:' + room.name, true);
      user.set('preferences.room:notif:roomtopic:' + room.name, true);
      user.save(function (err) {
        return callback(err, room);
      });
    },

    function tracking (room, callback) {
      var keenEvent = {
        session: {
          id: session.settings.uuid,
          connector: session.frontendId
        },
        user: {
          id: user.id,
          username: user.username,
          admin: (session.settings.admin === true)
        },
        room: {
          name: room.name
        }
      };
      keenio.addEvent('room_creation', keenEvent, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:create', next)(err);
    }

    return next(null, {success: true});
  });
};
