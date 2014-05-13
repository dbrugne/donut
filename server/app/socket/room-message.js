var delegate_error = require('./error');
var Room = require('../models/room');
var activityRecorder = require('../activity-recorder');

// @todo : load validator and escape message
// @todo : improve message validity test (ASCII)
// @todo : ACL (user in room)

module.exports = function(io, socket, data) {
  if (!Room.validateName(data.name)) {
    delegate_error('Invalid room name '+data.name, __dirname+'/'+__filename);
    return;
  }
  if (!validateMessage(data.message)) {
    delegate_error('Invalid room name '+data.name, __dirname+'/'+__filename);
    return;
  }

  io.sockets.in(data.name).emit('room:message', {
    name: data.name,
    time: Date.now(),
    message: data.message,
    user_id: socket.getUserId(),
    username: socket.getUsername()
  });

  // Activity
  activityRecorder('room:message', socket.getUserId(), data);

};

function validateMessage(message) {
  var pattern = /^.{1,1000}$/i;
  if (pattern.test(message)) {
    return true;
  }
  return false;
}
