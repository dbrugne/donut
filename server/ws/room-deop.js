var helper = require('./helper');

module.exports = function(io, socket, data) {

  // Find and return room model
  helper.findRoom(data.name, handleRoom, helper.handleError);

  function handleRoom(room) {
    helper.findUser(data.username, function(user) {
      handleSuccess(room, user);
    }, helper.handleError);
  }

  function handleSuccess(room, user) {
    // Is user a room owner or op
    if (!helper.isOwnerOrOp(io, room, socket.getUserId()))
      return helper.handleError('Room deop, requesting user is not room owner or op');

    // Is the targeted user already not a OP of this room
    if (room.op.indexOf(user._id) === -1)
      return helper.handleError('User '+user.username+' is already deOP of '+room.name);

    // Persist on room
    room.op.pull(user._id);
    room.save();

    var deopEvent = {
      name: room.name,
      time: Date.now(),
      by_user_id : socket.getUserId(),
      by_username: socket.getUsername(),
      by_avatar  : socket.getAvatar(),
      user_id: user._id.toString(),
      username: user.username,
      avatar: user.avatar
    };

    // Inform other room users
    io.to(room.name).emit('room:deop', deopEvent);

    // Activity
    helper.record('room:deop', socket, deopEvent);
  };
};
