var async = require('async');
var helper = require('./helper');
var logger = require('../app/models/log');
var Room = require('../app/models/room');
var User = require('../app/models/user');
var roomEmitter = require('./_room-emitter');

module.exports = function(io, socket, data) {

  if (!data.name)
    return helper.handleError('room:kick require room name param');

  if (!data.username)
    return helper.handleError('room:kick require username param');

  async.waterfall([

    function retrieveRoom(callback) {

      helper.retrieveRoom(data.name, function (err, room) {
        if (err)
          return callback('Error while retrieving room in room:kick: '+err);

        if (!room)
          return callback('Unable to retrieve room in room:kick: '+data.name);

        return callback(null, room);
      });

    },

    function retrieveUser(room, callback) {

      helper.retrieveUser(data.username, function (err, user) {
        if (err)
          return callback('Error while retrieving user in room:kick: '+err);

        if (!user)
          return callback('Unable to retrieve user in room:kick: '+data.username);

        return callback(null, room, user);
      });

    },

    function permissions(room, user, callback) {

      // Is owner or OP
      if (!helper.isOwnerOrOp(io, room, socket.getUserId()))
        return callback('Current user "'+socket.getUsername()+'" is not allowed'
          +' to kick from this room "'+data.name);

      // Can't kick owner
      if (helper.isOwner(io, room, user._id.toString()))
        return callback('Can\'t kick owner out of room: '+data.name);

      // Targeted user should be in room
      if (user.rooms.indexOf(room.name) === -1)
        return callback('Can\'t kick user '+user.username+' that is not actually in the room: '+data.name);

      return callback(null, room, user);

    },

    function update(room, user, callback) {

      // Update persistence
      user.update({$pull: { rooms: room.name }}, function(err, affectedDocuments) {
        if (err)
          helper.handleError('Unable to update user on room kick: '+err);

        callback(null, room, user);

      });

    },

    function send(room, user, callback) {

      var event = {
        by_user_id : socket.getUserId(),
        by_username: socket.getUsername(),
        by_avatar  : socket.getAvatar(),
        by_color  : socket.getColor(),
        user_id: user._id.toString(),
        username: user.username,
        avatar: user._avatar(),
        color: user.color
      };

      if (data.reason)
        event.reason = data.reason;

      // Inform room users
      roomEmitter(io, room.name, 'room:kick', event, function(err) {
        if (err)
          return callback(err);

        return callback(null, room, user, event);
      });
    },

    function leave(room, user, callback) {

      /**
       * /!\ .leave come after .send to allow kicked user to receive message
       */

      // Make all user's sockets leave
      helper._.each(helper.userSockets(io, user._id.toString()), function(s) {
        s.leave(room.name);
      });

    }

  ], function(err) {
    if (err)
      return helper.handleError(err);

    logger.log('room:kick', socket.getUsername(), data.username+' on '+data.name);
  });

};
