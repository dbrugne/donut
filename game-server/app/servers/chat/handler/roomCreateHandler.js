var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var conf = require('../../../../../config/index');
var keenio = require('../../../../../shared/io/keenio');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle the creation of a room
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.create = function(data, session, next) {

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('name is mandatory for room:create');

      if (!Room.validateName(data.name))
        return callback('Invalid room name on room:create: '+data.name);

      return callback(null);
    },

    function retrieveUser(callback) {
      User.findByUid(session.uid).exec(function (err, user) {
        if (err)
          return callback('Error while retrieving user '+session.uid+' in room:create: '+err);

        if (!user)
          return callback('Unable to retrieve user in room:create: '+session.uid);

        return callback(null, user);
      });
    },

    function createRoom(user, callback) {
      var q = Room.findByName(data.name);
      q.exec(function(err, room) {
        if (err)
          return callback('Error while retrieving room in room:create: '+err);

        // Found an existing one
        if (room)
          return callback('alreadyexists');

        // Create a new one
        room = new Room({
          name: data.name,
          owner: user._id.toString(),
          color: conf.room.default.color,
          visibility: false, // not visible on home until admin change this value
          priority: 0
        });
        room.save(function (err, room) {
          if (err)
            return callback('Error while creating room: '+err);

          // tracking
          var keenEvent = {
            session: {
              id: session.settings.uuid,
              connector: session.frontendId
            },
            user: {
              id: session.uid,
              username: session.settings.username,
              admin: (session.settings.admin === true)
            },
            room: {
              name: room.name
            }
          };
          keenio.addEvent("room_creation", keenEvent, function(err, res){
            if (err)
              logger.error('Error while tracking room_creation in keen.io for '+user._id.toString()+': '+err);

            return callback(null, user, room);
          });
        });
      });
    }

  ], function(err, user, room) {
    if (err === 'alreadyexists')
      return next(null, {code: 403, err: err});
    if (err)
      return next(null, {code: 500, err: err});

    return next(null, {success: true});
  });

};