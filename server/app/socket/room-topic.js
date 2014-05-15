var delegate_error = require('./error');
var Room = require('../models/room');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {
  if (!Room.validateName(data.name)) {
    delegate_error('Invalid room name '+data.name, __dirname+'/'+__filename);
    return;
  }
  if (!Room.validateTopic(data.topic)) {
    delegate_error('Invalid room topic '+data.topic, __dirname+'/'+__filename);
    return;
  }

  // Save
  Room.update({_id: data.name}, {topic: data.topic}, function(err, numberAffected) {
    if (err) {
      delegate_error('Unable to change room '+data.name+' topic '+data.topic, __dirname+'/'+__filename);
      return;
    }

    io.sockets.in(data.name).emit('room:topic', {
      user_id: socket.getUserId(),
      username: socket.getUsername(),
      name: data.name,
      topic: data.topic
    });

    // Activity
    activityRecorder('room:topic', socket.getUserId(), data);

  });

};
