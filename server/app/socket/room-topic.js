var error = require('./error');
var Room = require('../models/room');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {
  if (!Room.validateName(data.name))
    return error('Invalid room name '+data.name);
  if (!Room.validateTopic(data.topic))
    return error('Invalid room topic '+data.topic);

  // Save
  var regexp = new RegExp(['^',data.name,'$'].join(''),'i');
  Room.findOneAndUpdate({ name: regexp }, {topic: data.topic}, function(err, room) {
    if (err) {
      error('Unable to change room '+data.name+' topic '+data.topic);
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
