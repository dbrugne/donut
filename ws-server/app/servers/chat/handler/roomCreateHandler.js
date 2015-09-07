'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var Room = require('../../../../../shared/models/room');
var conf = require('../../../../../config/index');
var _ = require('underscore');
var keenio = require('../../../../../shared/io/keenio');
var common = require('@dbrugne/donut-common');

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
        return callback('name is mandatory');
      }

      if (data.join_mode && (['everyone', 'allowed', 'password'].indexOf(data.join_mode) === -1)) {
        return callback('join_mode not valid' + data.join_mode);
      }

      if (data.history_mode && (['everyone', 'joined', 'none'].indexOf(data.history_mode) === -1)) {
        return callback('history_mode not valid' + data.history_mode);
      }

      return callback(null);
    },

    function validate (callback) {
      var errors = {};

      // name
      if (!common.validateName(data.name)) {
        errors.name = 'invalid-name';
      }

      // join_mode_password
      if (_.has(data, 'join_mode') && _.has(data, 'join_mode_password')) {
        if (data.join_mode_password.length < 4 || data.join_mode_password.length > 255) {
          errors.join_mode_password = 'join-mode-password';
        }
      }

      if (Object.keys(errors).length > 0) {
        return callback(errors); // object
      }
      return callback(null);
    },

    function create (callback) {
      var q = Room.findByName(data.name);
      q.exec(function (err, room) {
        if (err) {
          return callback(err);
        }
        if (room) {
          return callback('alreadyexists');
        }

        var passwordHash;
        if (data.join_mode === 'password') {
          passwordHash = user.generateHash(data.join_mode_password);
        }

        room = Room.getNewRoom();
        room.name = data.name;
        room.owner = user.id;
        room.color = conf.room.default.color;
        room.visibility = false; // not visible on home until admin change this value
        room.priority = 0;
        if (data.join_mode) {
          room.join_mode = data.join_mode;
          if (data.join_mode === 'password') {
            room.join_mode_password = passwordHash;
          }
        } if (data.history_mode) {
          room.history_mode = data.history_mode;
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
    if (['mandatory', 'invalid-name', 'alreadyexists'].indexOf(err) !== -1) {
      return next(null, {code: 403, err: err});
    }
    if (err) {
      _.each(err, function (error) {
        logger.error('[room:create] ' + error);
      });
      return next(null, {code: 500, err: err});
    }

    return next(null, { success: true });
  });

};
