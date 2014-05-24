var _ = require('underscore');
var handleError = require('./error');
var helper = require('./helper');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket, data) {

  // Find, create and return room model
  helper.findCreateRoom(data.name, socket, handleSuccess, handleError);

  function handleSuccess(room) {
    // socket subscription
    socket.join(room.name);

    // Room user list
    var users = helper.roomUsers(io, room.name);

    // Room welcome
    socket.emit('room:welcome', {
      name: room.name,
      topic: room.topic,
      users: users
    });

    // Inform other room users
    io.sockets.in(room.name).emit('room:in', {
      name: room.name,
      user_id: socket.getUserId(),
      username: socket.getUsername()
    });

//    // Inform other devices @todo : bug on client side that rejoin the room automatically == loop
//    io.sockets.in('user:'+socket.getUserId()).emit('room:join', {
//      name: room.name
//    });

    // Persistence
    User.findOneAndUpdate({_id: socket.getUserId()}, {$addToSet: { rooms: room.name }}, function(err, user) {
      if (err) error('Unable to update user.rooms: '+err);
    });

    // Activity
    activityRecorder('room:join', socket.getUserId(), data);
  }

};
