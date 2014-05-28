var handleError = require('./error');
var helper = require('./helper');
var Room = require('../models/room');
var activityRecorder = require('../activity-recorder');

// @todo : ACL : is owner ?

module.exports = function(io, socket, data) {

  if (!Room.validateTopic(data.topic))
    return handleError('Invalid room topic '+data.topic);

  // Find and return room model
  helper.findRoom(data.name, handleSuccess, handleError);

  function handleSuccess(room) {
    // Input filtering
    data.topic = helper.inputFilter(data.topic, 130);

    room.update({topic: data.topic}, function(err) {
      if (err)
        return handleError('Unable to change room '+data.name+' topic '+data.topic);

      io.sockets.in(data.name).emit('room:topic', {
        user_id: socket.getUserId(),
        username: socket.getUsername(),
        avatar: socket.getAvatar(),
        name: data.name,
        topic: data.topic
      });

      // Activity
      activityRecorder('room:topic', socket.getUserId(), data);
    });
  }

};
