'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename);
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
      if (!data.name || !common.validate.name(data.name)) {
        return callback('invalid-name');
      }

      if (!data.mode || !common.validate.mode(data.mode)) {
        return callback('invalid-mode');
      }

      return callback(null);
    },

    function create (callback) {
      var q = RoomModel.findByName(data.name);
      q.exec(function (err, room) {
        if (err) {
          return callback(err);
        }
        if (room) {
          return callback('alreadyexists');
        }

        room = RoomModel.getNewRoom();
        room.name = data.name;
        room.owner = user.id;
        room.color = conf.room.default.color;
        room.visibility = false; // not visible on home until admin change this value
        room.priority = 0;
        room.mode = data.mode;
        if (data.mode === 'private' && data.password !== null) {
          room.password = data.password; //user.generateHash(data.password);
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
      logger.error('[room:create] ' + err);
      if (['invalid-name', 'invalid-mode', 'invalid-password', 'alreadyexists'].indexOf(err) !== -1) {
        return next(null, {code: 400, err: err});
      } else {
        return next(null, {code: 500, err: 'internal'});
      }
    }

    return next(null, {success: true});
  });
};
