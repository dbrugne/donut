var helper = require('./helper');

module.exports = function(io, socket) {

  // Multi-devices (should done before room:out)
  socket.leave('user:'+socket.getUserId());

  // Logic for room where user was in
  var rooms = helper.socketRooms(io, socket);
  for (var i=0; i < rooms.length; i++) {
    var roomName = rooms[i];
    // Socket unsubscription
    socket.leave(roomName);

    // Inform room clients that this user leave the room
    // (only if it was the last socket for this user)
    if (helper.userSockets(io, socket.getUserId()).length < 1) {
      io.sockets.in(roomName).emit('room:out', {
        name: roomName,
        user_id: socket.getUserId(),
        username: socket.getUsername(),
        avatar: socket.getAvatar()
      });
    }

    // Room deletion (if needed)
    helper.deleteRoom(io, roomName);
  }

  // Update users online users list (only if last socket for this user)
  if (helper.userSockets(io, socket.getUserId()).length < 1) {
    socket.broadcast.emit('user:offline', {
      user_id: socket.getUserId(),
      username: socket.getUsername(),
      avatar: socket.getAvatar()
    });
  }

  // Activity
  helper.record('disconnect', socket);
};
