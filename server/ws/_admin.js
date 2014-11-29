var _ = require('underscore');

function emit(socket, message) {
  socket.emit('room:message', {
    name: '#donut',
    time: Date.now(),
    message: message,
    user_id: socket.getUserId(),
    username: socket.getUsername(),
    avatar: socket.getAvatar(),
    color: socket.getColor()
  });
}

module.exports = function(io, socket, data, callback) {

  if (data.message.substring(0, 6) == '/hello') {
    emit(socket, 'Hello from server');
    return callback('admin');
  }

  if (data.message.substring(0, 8) == '/onlines') {
    var list = {};
    _.each(io.sockets.adapter.nsp.connected, function(s) {
      if (!list[s.getUserId()])
        list[s.getUserId()] = {
          username: s.getUsername(),
          sockets: [s.id]
        };
      else
        list[s.getUserId()].sockets.push(s.id);
    });
    var message = 'online users\n';
    _.each(list, function(u) {
      message += '- '+u.username+'\n';
      _.each(u.sockets, function(s) {
        message += '  ° '+s+'\n';
      });
    });
    emit(socket, message);
    return callback('admin');
  }

  return callback('admin');
};