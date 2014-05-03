var delegate_error = require('./error');
var Room = require('../models/room');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {
  if (!Room.validateName(data.name)) {
    delegate_error('Invalid room name '+data.name, __dirname+'/'+__filename);
    return;
  }

  Room.findByName(data.name, 'name owner_id', function(err, room) {
    if (err) {
      delegate_error('Unable to retrieve room '+err, __dirname+'/'+__filename);
      return;
    }

    socket.emit('room:profile', {
      room: room
    });
  });

  // Activity
  activityRecorder('room:profile', socket.getUserId(), data);

};
