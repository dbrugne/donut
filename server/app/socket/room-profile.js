var error = require('./error');
var Room = require('../models/room');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {
  if (!Room.validateName(data.name)) {
    error('Invalid room name '+data.name);
    return;
  }

  Room.findByName(data.name, 'name owner_id', function(err, room) {
    if (err) {
      error('Unable to retrieve room '+err);
      return;
    }

    var roomData = user.toJSON();
    delete roomData._id;
    socket.emit('room:profile', {
      room: roomData
    });
  });

  // Activity
  activityRecorder('room:profile', socket.getUserId(), data);

};
