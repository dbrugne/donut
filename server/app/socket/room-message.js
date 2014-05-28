var helper = require('./helper');

module.exports = function(io, socket, data) {

  // Find and return room model
  helper.findRoom(data.name, handleSuccess, helper.handleError);

  function handleSuccess(room) {
    // Test if the current socket is in room
    if (!helper.isSocketInRoom(io, socket, room.name))
     return helper.handleError('This socket is not currently in room');

    // Input filtering
    data.message = helper.inputFilter(data.message, 512);
    if (data.message == '') return;

    // Broadcast message
    io.sockets.in(data.name).emit('room:message', {
      name: data.name,
      time: Date.now(),
      message: data.message,
      user_id: socket.getUserId(),
      username: socket.getUsername(),
      avatar: socket.getAvatar()
    });

    // Activity
    helper.record('room:message', socket, data);
  }

};
