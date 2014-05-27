var handleError = require('./error');
var helper = require('./helper');
var activityRecorder = require('../activity-recorder');

// @todo : load validator and escape message
// @todo : improve message validity test (ASCII)
// @todo : ACL (user in room)

module.exports = function(io, socket, data) {

  // Find and return room model
  helper.findRoom(data.name, handleSuccess, handleError);

  function handleSuccess(room) {
    if (!validateMessage(data.message))
      return error('Invalid message for '+data.name+' => '+data.message);

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
    activityRecorder('room:message', socket.getUserId(), data);
  }

};

function validateMessage(message) { // @todo delegate to model ?
  var pattern = /^.{1,1000}$/i;
  if (pattern.test(message)) {
    return true;
  }
  return false;
}
