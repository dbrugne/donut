var delegate_error = require('./error');
var Room = require('../models/room');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

// @todo test room existence
// @todo broadcast other devices
// @todo room deletion on last client leaved and permanent != 0

module.exports = function(io, socket, data) {

  if (!Room.validateName(data.name)) {
    delegate_error('Invalid room name '+data.name, __dirname+'/'+__filename);
    return;
  }

  User.update({
    _id: socket.getUserId()
  },{
    $pull: { rooms: data.name }
  }, function(err, affectedDocuments) {
    if (err) {
      delegate_error('Unable to update user on exiting room '+data.name, __dirname+'/'+__filename);
      return;
    }

    // Socket unsubscription
    socket.leave(data.name);

    // Inform other room users
    // @todo : only on last socket leave for this user (multi-device)
    io.sockets.in(data.name).emit('room:out', {
      name: data.name,
      user_id: socket.getUserId()
    });

    // Activity
    activityRecorder('room:leave', socket.getUserId(), data);

  });
};
