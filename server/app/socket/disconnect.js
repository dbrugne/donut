var delegate_error = require('./error');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket) {

  // Inform other rooms users
  Object.keys(io.sockets.manager.roomClients[socket.id]).forEach(function(key) {
    if (key == '') return;
    if (key.substring(0, 2) != '/#') return;

    var roomName = key.substring(1);

    io.sockets.in(roomName).emit('room:out', {
      name: roomName,
      user_id: socket.getUserId()
    });
  });

  // Multi-devices
  socket.leave('user:'+socket.getUserId());

  // Update users online users list
  socket.broadcast.emit('user:offline', {
    user_id: socket.getUserId()
  });

  // Activity
  activityRecorder('disconnect', socket.getUserId());

};
