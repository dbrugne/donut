var delegate_error = require('./error');
var Room = require('../models/room');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

// @todo test room existence
// @todo broadcast other devices
// @todo room deletion on last client leaved and permanent != 0

module.exports = function(io, socket, data) {

  // @todo : create method in helper that:
  // - check room name validity
  // - 'find room in cache'
  // - find room in mongo
  // - return room or error

  if (!Room.validateName(data.name)) {
    delegate_error('Invalid room name '+data.name, __dirname+'/'+__filename);
    return;
  }

  var regexp = new RegExp(['^', data.name, '$'].join(''), 'i');
  Room.findOne({ name: regexp }, function(err, room) {
    if (err) {
      delegate_error('Unable to update room on exiting user '+err, __dirname+'/'+__filename);
      return;
    }

    // Socket unsubscription
    socket.leave(data.name);

    // Inform other room users
    io.sockets.in(data.name).emit('room:out', {
      name: data.name,
      user_id: socket.getUserId()
    });

    // Persistence
    socket.getUser().update({$pull: { rooms: data.name }}, function(err, affectedDocuments) {
      if (err)
        return delegate_error('Unable to update user on exiting room '+err, __dirname+'/'+__filename);
    });

    // Activity
    activityRecorder('room:leave', socket.getUserId(), data);
  });
};
