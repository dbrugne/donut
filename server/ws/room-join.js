var helper = require('./helper');
var User = require('../app/models/user');

module.exports = function(io, socket, data) {

  // Find, create and return room model
  helper.findCreateRoom(data.name, socket, handleHistory, helper.handleError);

  // Retrieve room history for this user
  function handleHistory(room) {
    helper.roomHistory(io, socket, room.name, 30, function(history) {
      handleSuccess(room, history);
    });
  }

  function handleSuccess(room, history) {

    // subscribe this user socket(s) to the room
    helper._.each(helper.userSockets(io, socket.getUserId()), function(s) {
      s.join(room.name);
    });

    // Room user list
    var users = helper.roomUsers(io, room.name);

    // Room welcome
    var welcome = {
      name: room.name,
      owner: {},
      op: room.op || [],
      permanent: room.permanent,
      avatar: room.avatarUrl('large'),
      poster: room.posterUrl(),
      color: room.color,
      topic: room.topic,
      users: users
    };
    if (room.owner) {
      welcome.owner = {
        user_id: room.owner._id,
        username: room.owner.username
      };
    }
//    socket.emit('room:welcome', welcome);
    io.to('user:'+socket.getUserId()).emit('room:welcome', welcome);

    // Inform other room users
    var roomInEvent = {
      name: room.name,
      time: Date.now(),
      user_id: socket.getUserId(),
      username: socket.getUsername(),
      avatar: socket.getAvatar('medium')
    };
    io.to(room.name).emit('room:in', roomInEvent);// @todo : send room:in before to avoid receiving it

//    // Inform other devices => see room:welcome broadcasted to all user socket
//    io.to('user:'+socket.getUserId()).emit('room:join', { // @todo : rename to room:pleasejoin + send all room data to allow client only do a rooms.addModel()
//      name: room.name
//    });

    // Persistence
    User.findOneAndUpdate({_id: socket.getUserId()}, {$addToSet: { rooms: room.name }}, function(err, user) {
      if (err) helper.handleError('Unable to update user.rooms: '+err);
    });

    // Activity
    var receivers = helper.roomUsersId(io, room.name);
    helper.record('room:in', socket, roomInEvent, receivers);
  }

};
