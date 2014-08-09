var helper = require('./helper');

module.exports = function(io, socket, data) {

  helper.findRoom(data.name, handleSuccess, helper.handleError);

  function handleSuccess(room) {
    var owner = {};
    if (room.owner) {
      owner = {
        user_id: room.owner._id,
        username: room.owner.username
      };
    }

    var readEvent = {
      name: room.name,
      owner: owner,
      op: room.op,
      users: helper.roomUsers(io, room.name).length,
      permanent: room.permanent,
      avatar: room.avatar,
      poster: room.poster,
      color: room.color,
      website: room.website,
      topic: room.topic,
      description: room.description
    };

    socket.emit('room:read', readEvent);
    // Activity
    helper.record('room:read', socket, readEvent);
  }
};
