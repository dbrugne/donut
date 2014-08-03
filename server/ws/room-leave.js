var helper = require('./helper');

module.exports = function(io, socket, data) {

  // Find and return room model
  helper.findRoom(data.name, handleSuccess, helper.handleError);

  function handleSuccess(room) {

    // unsubscribe this user socket(s) to the room
    helper._.each(helper.userSockets(io, socket.getUserId()), function(s) {
      s.leave(room.name);
    });

    // Inform other room users
    var roomOutEvent = {
      name: room.name,
      time: Date.now(),
      user_id: socket.getUserId(),
      username: socket.getUsername(),
      avatar: socket.getAvatar('medium')
    };
    io.to(room.name).emit('room:out', roomOutEvent);

    // Inform other devices
    io.to('user:'+socket.getUserId()).emit('room:leave', {
      name: room.name
    });

    // Persistence
    socket.getUser().update({$pull: { rooms: room.name }}, function(err, affectedDocuments) {
      if (err)
        return helper.handleError('Unable to update user on exiting room '+err);
    });

    // Room deletion (if needed)
//    helper.deleteRoom(io, room.name);

    // Activity
    var receivers = helper.roomUsersId(io, room.name);
    helper.record('room:out', socket, roomOutEvent, receivers);
  };
};
