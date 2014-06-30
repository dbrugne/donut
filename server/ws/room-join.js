var helper = require('./helper');
var User = require('../app/models/user');

module.exports = function(io, socket, data) {

  // Find, create and return room model
  helper.findCreateRoom(data.name, socket, handleHistory, helper.handleError);

  // Retrieve room history for this user
  function handleHistory(room) {
    helper.roomHistory(io, socket, room.name, 30, function(history) {
      handleSuccess(room, history);
    });
  }

  function handleSuccess(room, history) {
    // socket subscription
    socket.join(room.name);

    // Room user list
    var users = helper.roomUsers(io, room.name);

    // Room welcome
    var welcome = {
      name: room.name,
      owner: {},
      op: room.op || [],
      permanent: room.permanent,
      avatar: room.avatarUrl('medium'),
      color: room.color,
      topic: room.topic,
      history: history,
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
    var roomInEvent = {
      name: room.name,
      time: Date.now(),
      user_id: socket.getUserId(),
      username: socket.getUsername(),
      avatar: socket.getAvatar()
    };
    io.sockets.in(room.name).emit('room:in', roomInEvent);

    // Inform other devices
    socket.broadcast.to('user:'+socket.getUserId()).emit('room:join', {
      name: room.name
    });

    // Persistence
    User.findOneAndUpdate({_id: socket.getUserId()}, {$addToSet: { rooms: room.name }}, function(err, user) {
      if (err) helper.handleError('Unable to update user.rooms: '+err);
    });

    // Activity
    var receivers = helper.roomUsersId(io, room.name);
    helper.record('room:in', socket, roomInEvent, receivers);
  }

};
