var async = require('async');
var helper = require('./helper');
var Room = require('../app/models/room');
var User = require('../app/models/user');

module.exports = function(io, socket, data) {

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('name is mandatory for room:leave');

      return callback(null);
    },

    function findRoom(callback) {
      var q = Room.findByName(data.name);
      q.exec(function(err, room) {
        if (err)
          return callback('Error while retrieving room in room:leave: '+err);

        return callback(null, room);
      });
    },

    function persistOnRoom(room, callback) {

      // persist on user
      room.update({$pull: { users: socket.getUserId() }}, function(err) {
        if (err)
          return callback('Unable to persist ($pull) users on room: '+err);

        return callback(null, room);
      });

    },

    function persistOnUser(room, callback) {

      // persist on user
      User.findOneAndUpdate({_id: socket.getUserId()}, {$pull: { rooms: room.name }}, function(err, user) {
        if (err)
          return callback('Unable to persist ($pull) rooms on user: '+err);

        return callback(null, room);
      });

    },

    function leaveSockets(room, callback) {

      // unsubscribe this user socket(s) from the room
      helper._.each(helper.userSockets(io, socket.getUserId()), function(s) {
        s.leave(room.name);
      });

      return callback(null, room);
    },

    function sendToUser(room, callback) {

      // Inform other devices
      io.to('user:'+socket.getUserId()).emit('room:leave', {
        name: room.name
      });

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
        color: socket.getColor() // @todo : color could be outdated
      };
      io.to(room.name).emit('room:out', event);

      return callback(null, room, event);
    }

  ], function(err, room, event) {
    if (err)
      return helper.handleError(err);

    // Activity
    var receivers = helper.roomUsersId(io, room.name);
    helper.record('room:out', socket, event, receivers);
  });

};
