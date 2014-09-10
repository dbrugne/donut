var helper = require('./helper');

module.exports = function(io, socket, data) {

  if (!data.name)
    return helper.handleError('room:op require room name param');

  if (!data.username)
    return helper.handleError('room:op require username param');

  // Find and return room model
  helper.findRoom(data.name, handleRoom, helper.handleError);

  function handleRoom(room) {
    if (!room)
      return helper.handleError('Unable to retrieve room in room:op: '+data.name);

    helper.findUser(data.username, function(user) {
      if (!user)
        return helper.handleError('Unable to retrieve user in room:op: '+data.username);

      handleSuccess(room, user);
    }, helper.handleError);
  }

  function handleSuccess(room, user) {
    // Is user a room owner or op
    if (!helper.isOwnerOrOp(io, room, socket.getUserId()))
      return helper.handleError('Room op, requesting user is not room owner or op');

    // Is the targeted user already OP of this room
    if (room.op.indexOf(user._id) !== -1)
      return helper.handleError('User '+user.username+' is already OP of '+room.name);

    // Persist on room
    room.op.addToSet(user._id);
    room.save();

    var opEvent = {
      name: room.name,
      time: Date.now(),
      by_user_id : socket.getUserId(),
      by_username: socket.getUsername(),
      by_avatar  : socket.getAvatar(),
      user_id: user._id.toString(),
      username: user.username,
      avatar: user._avatar()
    };

    // Inform other room users
    io.to(room.name).emit('room:op', opEvent);

    // Activity
    helper.record('room:op', socket, opEvent);
  };
};
