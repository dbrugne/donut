var handleError = require('./error');
var helper = require('./helper');
var activityRecorder = require('../activity-recorder');

// @todo room deletion on last client leaved and permanent != 0

module.exports = function(io, socket, data) {

  // Find and return room model
  helper.findRoom(data.name, handleSuccess, handleError);

  function handleSuccess(room) {
    // Socket unsubscription
    socket.leave(data.name);

    // Inform other room users
    io.sockets.in(data.name).emit('room:out', {
      name: data.name,
      user_id: socket.getUserId()
    });

    // Inform other devices
    io.sockets.in('user:'+socket.getUserId()).emit('room:leave', {
      name: room.name
    });

    // Persistence
    socket.getUser().update({$pull: { rooms: data.name }}, function(err, affectedDocuments) {
      if (err)
        return error('Unable to update user on exiting room '+err);
    });

    // Activity
    activityRecorder('room:leave', socket.getUserId(), data);
  };
};
