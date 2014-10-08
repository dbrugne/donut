var async = require('async');
var helper = require('./helper');
var roomDataHelper = require('./_room-data.js');
var Room = require('../app/models/room');
var User = require('../app/models/user');
var configuration = require('../config/index');

module.exports = function(io, socket, data) {

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('name is mandatory for room:join');

      if (!Room.validateName(data.name))
        return callback('Invalid room name on room:join: '+data.name);

      return callback(null);
    },

    function findOrCreateRoom(callback) {
      var q = Room.findByName(data.name);
      q.exec(function(err, room) {
        if (err)
          return callback('Error while retrieving room in room:join: '+err);

        // Found an existing one
        if (room)
          return callback(null, room);

        // Create a new one
        room = new Room({
          name: data.name,
          owner: socket.getUserId(),
          color: configuration.room.default.color
        });
        room.save(function (err, room) {
          if (err)
            return callback('Error while creating room: '+err);

          helper.record('room:create', socket, {_id: room.get('_id'), name: room.get('name')});
          return callback(null, room);
        });
      });
    },

    function persistOnRoom(room, callback) {
      // Last join date
      room.lastjoin_at = Date.now();
      room.users.addToSet(socket.getUserId());
      room.save(function(err) {
        if (err)
          return callback('Error while updating room on room:join: '+err);

        return callback(null, room);
      });
    },

    function persistOnUser(room, callback) {
      // persist on user
      User.findOneAndUpdate({_id: socket.getUserId()}, {$addToSet: { rooms: room.name }}, function(err, user) {
        if (err)
          return callback('Unable to persist ($addToSet) rooms on user: '+err);

        return callback(null, room);
      });
    },

    function joinSockets(room, callback) {

      // subscribe this user socket(s) to the room
      helper._.each(helper.userSockets(io, socket.getUserId()), function(s) {
        s.join(room.name);
      });

      return callback(null, room);
    },

    function getWelcomeData(room, callback) {
      roomDataHelper(io, socket, room.name, function(err, roomData) {
        if (err)
          return callback(err);

        if (roomData == null)
          return callback('roomDataHelper was unable to return excepted room data: '+room.name);

        return callback(null, room, roomData);
      });
    },

    function sendToUser(room, roomData, callback) {
      io.to('user:'+socket.getUserId()).emit('room:welcome', roomData);
      return callback(null, room);
    },

    function sendToUsers(room, callback) {
      // Inform other room users
      var event = {
        name: room.name,
        time: Date.now(),
        user_id: socket.getUserId(),
        username: socket.getUsername(),
        avatar: socket.getAvatar(), // @todo : avatar could be outdated
        color: socket.getColor()  // @todo : color could be outdated
      };
      io.to(room.name).emit('room:in', event);

      return callback(null, room, event);
    }

  ], function(err, room, event) {
    if (err)
      return helper.handleError(err);

    helper.history.room('room:in', event);
  });

};
