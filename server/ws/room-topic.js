var helper = require('./helper');
var Room = require('../app/models/room');

module.exports = function(io, socket, data) {

  if (!Room.validateTopic(data.topic))
    return helper.handleError('Invalid room topic '+data.topic);

  // Find and return room model
  helper.findRoom(data.name, handleSuccess, helper.handleError);

  function handleSuccess(room) {
    // Is user a room owner?
    // @todo : allow also op, factorize helper.isOwner(room, user) and helper.isOp(room, user) methods
    if (room.owner._id.toString() != socket.getUserId())
      return helper.handleError('Room topic, user is not room owner');

    // Input filtering
    data.topic = helper.inputFilter(data.topic, 130);

    room.update({topic: data.topic}, function(err) {
      if (err)
        return helper.handleError('Unable to change room '+data.name+' topic '+data.topic);

      var roomTopicEvent = {
        name    : data.name,
        time: Date.now(),
        user_id : socket.getUserId(),
        username: socket.getUsername(),
        avatar  : socket.getAvatar('medium'),
        topic   : data.topic
      };
      io.to(data.name).emit('room:topic', roomTopicEvent);

      // Activity
      var receivers = helper.roomUsersId(io, room.name);
      helper.record('room:topic', socket, roomTopicEvent, receivers);
    });
  }

};
