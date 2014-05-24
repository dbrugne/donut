var handleError = require('./error');
var helper = require('./helper');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {

  helper.findUser(data.to, handleSuccess, handleError);

  function handleSuccess(userTo) {
    var from = socket.getUserId();
    var to = userTo._id.toString();

    var message = {
      from: socket.getUsername(),
      to: userTo.username,
      time: Date.now(),
      message: data.message,
      user_id: from,
      username: socket.getUsername()
    };

    // Broadcast message to all 'sender' devices
    io.sockets.in('user:'+from).emit('user:message', message);

    // (if sender!=receiver) Broadcast message to all 'receiver' devices
    if (from !==  to)
      io.sockets.in('user:'+to).emit('user:message', message);

    // Activity
    activityRecorder('user:message', socket.getUserId(), data);
  }
};
