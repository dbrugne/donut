var async = require('async');
var helper = require('./helper');
var logger = require('../app/models/log');
var roomEmitter = require('./_room-emitter');
var admin = require('./_admin');

module.exports = function(io, socket, data) {

  var start = logger.start();

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('name is mandatory for room:message');

      return callback(null);
    },

    function adminCommands(callback) {
      if (data.name != '#donut'
        || !socket.isAdmin()
        || !data.message
        || data.message.substring(0, 1) != '/')
        return callback(null);

      admin(io, socket, data, callback);
    },

    function retrieveRoom(callback) {
      helper.retrieveRoom(data.name, function (err, room) {
        if (err)
          return callback('Error while retrieving room in room:message: '+err);

        if (!room)
          return callback('Unable to retrieve room in room:message: '+data.name);

        return callback(null, room);
      });
    },

    function retrieveUser(room, callback) {

      helper.retrieveUser(socket.getUsername(), function (err, user) {
        if (err)
          return callback('Error while retrieving user in room:message: '+err);

        if (!user)
          return callback('Unable to retrieve user in room:message: '+socket.getUsername());

        return callback(null, room, user);
      });

    },

    function checkSocket(room, user, callback) {
      // Test if the current user is in room
      if (user.rooms.indexOf(room.name) === -1)
        return callback('room:message, this socket '+socket.getUsername()+' is not currently in room '+room.name);

      return callback(null, room);
    },

    function prepareEvent(room, callback) {

      // Input filtering
      data.message = helper.inputFilter(data.message, 512);

      if (data.message == '')
        return callback('Empty room:message');

      var event = {
        name: room.name,
        time: Date.now(),
        message: data.message,
        user_id: socket.getUserId(),
        username: socket.getUsername(),
        avatar: socket.getAvatar(),
        color: socket.getColor()
      };
      return callback(null, room, event);

    },

    function historizeAndEmit(room, event, callback) {
      roomEmitter(io, room.name, 'room:message', event, function(err) {
        if (err)
          return callback(err);

        return callback(null);
      });
    }

  ], function(err) {
    if (err == 'admin')
      return;
    if (err)
      helper.handleError(err);

    logger.log('room:message', socket.getUsername(), data.name, start);
  });

};
