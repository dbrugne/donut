var handleError = require('./error');
var helper = require('./helper');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {

  // Find and return room model
  helper.findRoom(data.name, handleSuccess, handleError);

  function handleSuccess(room) {
    // Socket unsubscription
    socket.leave(room.name);

    // Inform other room users
    io.sockets.in(room.name).emit('room:out', {
      name: room.name,
      user_id: socket.getUserId(),
      username: socket.getUsername()
    });

    // Inform other devices
    io.sockets.in('user:'+socket.getUserId()).emit('room:leave', {
      name: room.name
    });

    // Persistence
    socket.getUser().update({$pull: { rooms: room.name }}, function(err, affectedDocuments) {
      if (err)
        return error('Unable to update user on exiting room '+err);
    });

    // Room deletion (if needed)
    if (helper.roomSockets(io, room.name).length < 1
        && room.name.toLowerCase() != '#general'
        && room.name.toLowerCase() != '#support' ) { // @todo dirty hack until permanent room management
      room.remove();
      activityRecorder('room:delete', socket.getUserId(), {_id: room.get('_id'), name: room.get('name')});
    }

    // Activity
    activityRecorder('room:leave', socket.getUserId(), data);
  };
};
