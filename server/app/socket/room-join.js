var _ = require('underscore');
var delegate_error = require('./error');
var Room = require('../models/room');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

// @todo : persist room.users and user.rooms correctly

module.exports = function(io, socket, data) {

  if (!Room.validateName(data.name)) {
    delegate_error('Invalid room name '+data.name, __dirname+'/'+__filename);
    return;
  }

  var regexp = new RegExp(['^',data.name,'$'].join(''),'i');
  Room.findOne({ name: regexp }, 'name topic users', function(err, room) {
    if (err) return console.log(err);

    // Create room if needed
    if (!room) {
      room = new Room({
        name: data.name,
        owner_id: socket.getUserId()
      });
      room.save(function (err, room, numberAffected) {
        if (err) return console.log('room.save: '+err);

        onSuccess(room);
        activityRecorder('room:create', socket.getUserId(), {_id: room.get('_id'), name: room.get('name')});
      });
    } else {
      onSuccess(room);
    }
  });

  function onSuccess(room) {
    User.findOneAndUpdate({_id: socket.getUserId()}, {$addToSet: { rooms: room.name }}, function(err, user) {
      if (err) return console.log('User.findOneAndUpdate: '+err);
      room.update({$addToSet: { users: socket.getUserId() }}, function(err) {
        if (err) return console.log('room.update: '+err);
        room.populate('users', 'username', function(err, room) {
          if (err) return console.log(err);
          // socket subscription
          socket.join(room.name);

          // Decorate user list
          var users = [];
          _.each(room.users, function(dbUser) {
            users.push({
              user_id: dbUser._id,
              username: dbUser.username
            });
          });

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

          // Activity
          activityRecorder('room:join', socket.getUserId(), data);
        });
      });
    });
  };
};
