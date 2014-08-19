var helper = require('./helper');
var Room = require('../app/models/room');

module.exports = function(io, socket, data) {

  if (!data.name)
    return helper.handleError('room:topic require room name param');

  if (!Room.validateTopic(data.topic))
    return helper.handleError('Invalid room topic '+data.topic);

  // Find and return room model
  helper.findRoom(data.name, handleSuccess, helper.handleError);

  function handleSuccess(room) {
    if (!room)
      return helper.handleError('Unable to retrieve room in room:topic: '+data.name);

    // Is user a room owner or op
    if (!helper.isOwnerOrOp(io, room, socket.getUserId()))
      return helper.handleError('Room topic, requesting user is not room owner or op');

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
