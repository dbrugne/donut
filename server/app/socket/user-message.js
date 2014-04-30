var delegate_error = require('./error');
var User = require('../models/user');

module.exports = function(io, socket, data) {

  var from = socket.getUserId();

  // @todo : test that data.to exists in database
  var to = data.to;

  var message = {
    from: from,
    to: to,
    time: Date.now(),
    message: data.message,
    user_id: socket.getUserId(),
    username: socket.getUsername(),
    avatar: '/'+socket.getAvatar()
  };

  io.sockets.in('user:'+from).emit('user:message', message);
  if (from != to) { // only if sender is not also the receiver
    io.sockets.in('user:'+to).emit('user:message', message);
  }

  // @todo : activity

};
