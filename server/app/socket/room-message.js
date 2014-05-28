var helper = require('./helper');

// @todo : ACL : user in room ?

module.exports = function(io, socket, data) {

  // Find and return room model
  helper.findRoom(data.name, handleSuccess, helper.handleError);

  function handleSuccess(room) {
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
