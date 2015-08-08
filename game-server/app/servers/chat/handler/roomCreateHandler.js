var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Room = require('../../../../../shared/models/room');
var conf = require('../../../../../config/index');
var keenio = require('../../../../../shared/io/keenio');
var common = require('donut-common');

var Handler = function(app) {
  this.app = app;
};

module.exports = function(app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.create = function(data, session, next) {

  var user = session.__currentUser__;

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('name is mandatory');

      if (!common.validateName(data.name))
        return callback('Invalid room name: '+data.name);

      return callback(null);
    },

    function create(callback) {
      var q = Room.findByName(data.name);
      q.exec(function(err, room) {
        if (err)
          return callback(err);

        if (room)
          return callback('alreadyexists');

        room = new Room({
          name: data.name,
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
    if (err === 'alreadyexists')
      return next(null, { code: 403, err: err });
    if (err)
      return next(null, { code: 500, err: err });

    return next(null, { success: true });
  });

};