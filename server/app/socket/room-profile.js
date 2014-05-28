var helper = require('./helper');

module.exports = function(io, socket, data) {

  helper.findRoom(data.name, handleSuccess, helper.handleError);

  function handleSuccess(room) {
    var roomData = room.toJSON();
    delete roomData._id;
    socket.emit('room:profile', {
      room: roomData
    });
    // Activity
    helper.record('room:profile', socket, data);
  }
};
