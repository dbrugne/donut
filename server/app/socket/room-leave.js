var helper = require('./helper');

module.exports = function(io, socket, data) {

  // Find and return room model
  helper.findRoom(data.name, handleSuccess, helper.handleError);

  function handleSuccess(room) {
    // Socket unsubscription
    socket.leave(room.name);

    // Inform other room users
    var roomOutEvent = {
      name: room.name,
      user_id: socket.getUserId(),
      username: socket.getUsername(),
      avatar: socket.getAvatar()
    };
    io.sockets.in(room.name).emit('room:out', roomOutEvent);

    // Inform other devices
    socket.broadcast.to('user:'+socket.getUserId()).emit('room:leave', {
      name: room.name
    });

    // Persistence
    socket.getUser().update({$pull: { rooms: room.name }}, function(err, affectedDocuments) {
      if (err)
        return helper.handleError('Unable to update user on exiting room '+err);
    });

    // Room deletion (if needed)
    helper.deleteRoom(io, room.name);

    // Activity
    var receivers = helper.roomUsersId(io, room.name);
    helper.record('room:out', socket, roomOutEvent, receivers);
  };
};
