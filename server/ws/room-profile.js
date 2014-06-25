var helper = require('./helper');

module.exports = function(io, socket, data) {

  helper.findRoom(data.name, handleSuccess, helper.handleError);

  function handleSuccess(room) {
    var ownerData = room.owner.toJSON();
    ownerData.avatar = room.owner.avatarUrl('small');
    ownerData.user_id = ownerData._id;
    delete ownerData._id;

    var roomData = room.toJSON();
    roomData.owner = ownerData;
    roomData.avatar = room.avatarUrl('large');
    delete roomData._id;
    socket.emit('room:profile', {
      room: roomData
    });
    // Activity
    helper.record('room:profile', socket, data);
  }
};
