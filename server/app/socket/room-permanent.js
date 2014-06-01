var helper = require('./helper');

module.exports = function(io, socket, data) {

  // Find and return room model
  helper.findRoom(data.name, handleSuccess, helper.handleError);

  function handleSuccess(room) {

    // @todo : check that user is owner

    // @todo : check that data.permanent is boolean
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
