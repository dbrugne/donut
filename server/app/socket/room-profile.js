var handleError = require('./error');
var helper = require('./helper');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {

  helper.findRoom(data.name, handleSuccess, handleError);

  function handleSuccess(room) {
    var roomData = room.toJSON();
    delete roomData._id;
    socket.emit('room:profile', {
      room: roomData
    });
    // Activity
    activityRecorder('room:profile', socket.getUserId(), data);
  }
};
