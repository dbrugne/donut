var helper = require('./helper');

module.exports = function(io, socket, data) {

  // Validate input
  if (data.permanent !== true && data.permanent !== false)
    return helper.handleError('Invalid permanent value: '+data.permanent);

  // Find and return room model
  helper.findRoom(data.name, handleSuccess, helper.handleError);

  function handleSuccess(room) {

    // Is user the room owner
    if (!room.owner._id || room.owner._id.toString() != socket.getUserId())
      return helper.handleError('This user is not the owner of '+data.name);

    var bool = (data.permanent === true)
      ? true
      : false;

    room.permanent = bool;
    room.save();

    // Inform other room users
    io.sockets.in(room.name).emit('room:permanent', {
      name: room.name,
      permanent: bool
    });

    // Activity
    helper.record('room:permanent', socket, data);
  };
};
