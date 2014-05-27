var error = require('./error');
var helper = require('./helper');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket) {

  // Multi-devices (should done before room users information)
  socket.leave('user:'+socket.getUserId());

  // Inform other rooms users
  var rooms = helper.socketRooms(io, socket);
  for (var i=0; i < rooms.length; i++) {
    var roomName = rooms[i];

    // Inform room clients that this user leave the room
    // (only if it was the last socket for this user)
    if (io.sockets.clients('user:'+socket.getUserId()).length < 1) {
      io.sockets.in(roomName).emit('room:out', {
        name: roomName,
        user_id: socket.getUserId(),
        username: socket.getUsername(),
        avatar: socket.getAvatar()
      });
    }
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
  activityRecorder('disconnect', socket.getUserId());

};
