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
    var welcome = {
      name: room.name,
      owner: {},
      avatar: room.avatarUrl('medium'),
      color: room.color,
      topic: room.topic,
      permanent: room.permanent,
      users: users
    };
    if (room.owner) {
      welcome.owner = {
        user_id: room.owner._id,
        username: room.owner.username,
        avatar: room.owner.avatarUrl('small')
      };
    }
    socket.emit('room:welcome', welcome);

    // Inform other room users
    io.sockets.in(room.name).emit('room:in', {
      name: room.name,
      user_id: socket.getUserId(),
      username: socket.getUsername(),
      avatar: socket.getAvatar()
    });

    // Inform other devices
    socket.broadcast.to('user:'+socket.getUserId()).emit('room:join', {
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
