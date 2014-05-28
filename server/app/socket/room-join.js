var helper = require('./helper');
var User = require('../models/user');

module.exports = function(io, socket, data) {

  // Find, create and return room model
  helper.findCreateRoom(data.name, socket, handleSuccess, helper.handleError);

  function handleSuccess(room) {
    // socket subscription
    socket.join(room.name);

    // Room user list
    var users = helper.roomUsers(io, room.name);

    // Room welcome
    socket.emit('room:welcome', {
      name: room.name,
      topic: room.topic,
      users: users
    });

    // Inform other room users
    io.sockets.in(room.name).emit('room:in', {
      name: room.name,
      user_id: socket.getUserId(),
      username: socket.getUsername(),
      avatar: socket.getAvatar()
    });

    // Inform other devices
    io.sockets.in('user:'+socket.getUserId()).emit('room:join', {
      name: room.name
    });

    // Persistence
    User.findOneAndUpdate({_id: socket.getUserId()}, {$addToSet: { rooms: room.name }}, function(err, user) {
      if (err) helper.handleError('Unable to update user.rooms: '+err);
    });

    // Activity
    helper.record('room:join', socket, data);
  }

};
