var delegate_error = require('./error');

module.exports = function(io, socket) {

  // Multi-devices
  socket.leave('user:'+socket.getUserId());

  // Update users online users list
  socket.broadcast.emit('user:offline', {
    id: socket.getUserId()
  });

  // @todo : activity

};
