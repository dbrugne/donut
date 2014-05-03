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

  Room.findById(data.name, 'name topic users', function(err, room) {
    if (err) return console.log(err);

    // Create room if needed
    if (!room) {
      var name = new String(data.name);
      name = name.replace('#', '');
      room = new Room({_id: data.name, name: name, owner_id: socket.getUserId()});
      room.save(function (err, product, numberAffected) {
        if (err) return console.log(err);

        onSuccess(room);
        activityRecorder('room:create', socket.getUserId(), {_id: data.name});
      });
    } else {
      onSuccess(room);
    }
  });

  function onSuccess(room) {
    User.findOneAndUpdate({_id: socket.getUserId()}, {$addToSet: { rooms: room._id }}, function(err, user) {
      if (err) return console.log(err);

      Room.findOneAndUpdate({_id: room.get('_id')}, {$addToSet: { users: socket.getUserId() }}, function(err, room) {
        if (err) return console.log(err);
        room.populate('users', 'username avatar', function(err, room) {
          if (err) return console.log(err);
          // socket subscription
          socket.join(data.name);

          // Decorate user list
          var users = [];
          _.each(room.users, function(dbUser) {
            var avatarUrl = '';
            if (dbUser.avatar && dbUser.avatar.small.url) {
              avatarUrl = dbUser.avatar.small.url;
            }
            users.push({
              user_id: dbUser._id,
              username: dbUser.username,
              avatar: avatarUrl
            });
          });

          // Room welcome
          socket.emit('room:welcome', {
            name: room._id,
            topic: room.topic,
            users: users
          });

          // Inform other room users
          io.sockets.in(data.name).emit('room:in', {
            name: data.name,
            user_id: socket.getUserId(),
            username: socket.getUsername(),
            avatar: '/'+socket.getAvatar()
          });

          // Activity
          activityRecorder('room:join', socket.getUserId(), data);

            });
          });
        });
//      });
//    });
  };

};
