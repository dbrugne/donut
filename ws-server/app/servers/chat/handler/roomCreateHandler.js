var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Room = require('../../../../../shared/models/room');
var conf = require('../../../../../config/index');
var keenio = require('../../../../../shared/io/keenio');
var common = require('@dbrugne/donut-common');

var Handler = function(app) {
  this.app = app;
};

module.exports = function(app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function(data, session, next) {

  var user = session.__currentUser__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.name) {
        return callback('mandatory');
      }

      if (data.join_mode && (['everyone', 'allowed', 'password'].indexOf(data.join_mode) === -1)) {
        return callback('join_mode not valid' + data.join_mode);
      }

      if (data.history_mode && (['everyone', 'joined', 'none'].indexOf(data.join_mode) === -1)) {
        return callback('history_mode not valid' + data.history_mode);
      }

      if (data.join_mode === 'password' && !data.join_mode_password) {
        return callback('join_mode_password is mandatory for password mode room');
      }

      if (!common.validateName(data.name)) {
        return callback('invalid-name');
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

        room = Room.getNewRoom({
          name: data.name,
          join_mode: data.join_mode,
          history_mode: data.history_mode,
          join_mode_password: passwordHash,
          owner: user.id,
          color: conf.room.default.color,
          visibility: false, // not visible on home until admin change this value
          priority: 0
        });
        room.save(function (err) {
          return callback(err, room);
        });
      });
    },

    function setPreferencesOnOwner(room, callback) {
      user.set('preferences.room:notif:roomjoin:' + room.name, true);
      user.set('preferences.room:notif:roomtopic:' + room.name, true);
      user.save(function(err) {
        return callback(err, room);
      });
    },

    function tracking(room, callback) {
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
      keenio.addEvent("room_creation", keenEvent, callback);
    }

  ], function(err) {
    if ([
        'mandatory',
        'invalid-name',
        'alreadyexists'
      ].indexOf(err) !== -1)
      return next(null, { code: 403, err: err });
    if (err)
      return next(null, { code: 500, err: err });

    return next(null, { success: true });
  });

};