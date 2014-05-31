var helper = require('./helper');

module.exports = function(io, socket, data) {

  // Find and return room model
  helper.findRoom(data.name, handleSuccess, helper.handleError);

  function handleSuccess(room) {
    // Socket unsubscription
    socket.leave(room.name);

    // Inform other room users
    io.sockets.in(room.name).emit('room:out', {
      name: room.name,
      user_id: socket.getUserId(),
      username: socket.getUsername(),
      avatar: socket.getAvatar()
    });

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
    helper.record('room:leave', socket, data);
  };
};
