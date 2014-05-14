var delegate_error = require('./error');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');

module.exports = function(io, socket) {

  // Multi-devices: create a virtual room by user
  socket.join('user:'+socket.handshake.user._id);

  // Decorate socket (shortcut)
  socket.getUser = function() {
    return this.handshake.user;
  };
  socket.getUsername = function() {
    return this.handshake.user.username;
  }
  socket.getUserId = function() {
    return this.handshake.user._id;
  }

  // Welcome data
  User.findById(socket.getUserId(), 'rooms', function(err, user) {
    if (err) {
      delegate_error(err, __dirname+'/'+__filename);
      user.rooms = [];
    }

    // Online users list
    // @todo: should list users and not sockets
    var onlines = [];
    io.sockets.clients().forEach(function(online) {
      if (online.getUserId() == socket.getUserId()) return;
      onlines.push({
        user_id: online.getUserId(),
        username: online.getUsername()
      });
    });

    // Welcome
    socket.emit('welcome', {
      user: {
        user_id: socket.getUserId(),
        username: socket.getUsername()
      },
      rooms: user.rooms,
      onlines: onlines,
      home: {
        welcome: ['Bienvenue sur l\'interface de chat de roomly'],
        rooms: ['#toulouse', '#paintball', '#dagnirDae']
      }
    });
  });

  // Push this user to other users
  socket.broadcast.emit('user:online', {
    user_id: socket.getUserId(),
    username: socket.getUsername()
  });

  // Activity
  activityRecorder('connection', socket.getUserId(), {});

};