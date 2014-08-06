var helper = require('./helper');

module.exports = function(io, socket, data) {

  helper.findRoom(data.name, handleSuccess, helper.handleError);

  function handleSuccess(room) {

    // @todo : test if user can do update

    console.log('update room');
    console.log(room);

    // @todo update
     // validate data
     // prepare data (what to update? sanitization)
     // update (see http route for rules)

    // @todo prepare event with only new sanitized data
    io.to(room.name).emit('room:updated', data);

//    var owner = {};
//    if (room.owner) {
//      owner = {
//        user_id: room.owner._id,
//        username: room.owner.username
//      };
//    }
//
//    var profileEvent = {
//      name: room.name,
//      owner: owner,
//      op: room.op,
//      users: helper.roomUsers(io, room.name).length,
//      permanent: room.permanent,
//      avatar: room.avatarUrl('large'),
//      color: room.color,
//      website: room.website,
//      topic: room.topic,
//      description: room.description
//    };
//
//    socket.emit('room:read', profileEvent);
//    // Activity
//    helper.record('room:read', socket, profileEvent);
  }
};
