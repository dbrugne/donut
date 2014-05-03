var delegate_error = require('./error');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket) {

  // Multi-devices: create a virtual room by user
  socket.join('user:'+socket.handshake.user._id);

  // Decorate socket (shortcut)
  socket.getUsername = function() {
    return this.handshake.user.username;
  }
  socket.getUserId = function() {
    return this.handshake.user._id;
  }
  socket.getAvatar = function() {
    var uri = this.handshake.user.avatar.small.url;
    if (uri) {
      return '/'+uri.replace('\\', '/');
    } else {
      return 'default.jpg';
    }
  }

  // Welcome data
  User.findById(socket.getUserId(), 'rooms', function(err, user) {
    if (err) {
      delegate_error(err, __dirname+'/'+__filename);
      user.rooms = [];
    }
    socket.emit('welcome', {
      user_id: socket.getUserId(),
      username: socket.getUsername(),
      avatar: socket.getAvatar(),
      rooms: user.rooms
    });
  });

  // Push online users list
  io.sockets.clients().forEach(function(online) {
    if (online.getUserId() != socket.getUserId()) {
      socket.emit('user:online', {
        id: online.getUserId(),
        username: online.getUsername(),
        avatar: online.getAvatar()
      });
    }
  });

  // Push this user to other users
  socket.broadcast.emit('user:online', {
    id: socket.getUserId(),
    username: socket.getUsername(),
    avatar: '/'+socket.getAvatar()
  });

  // Activity
  activityRecorder('connection', socket.getUserId(), {});

};