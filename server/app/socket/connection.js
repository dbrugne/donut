var helper = require('./helper');
var User = require('../models/user');

module.exports = function(io, socket) {

  // Multi-devices: create a virtual room by user
  socket.join('user:'+socket.handshake.user._id);

  // Decorate socket (shortcut)
  socket.getUser = function() {
    return this.handshake.user;
  };
  socket.getUserId = function() {
    return this.handshake.user._id.toString();
  };
  socket.getUsername = function() {
    return this.handshake.user.username;
  };
  socket.getAvatar = function(format) {
    return this.handshake.user.avatarUrl(format);
  };

  // Welcome data
  User.findById(socket.getUserId(), 'username avatar rooms onetoones', function(err, user) {
    if (err) {
      helper.handleError('Unable to find user: '+err);
      user.rooms = [];
    }

    // force user entity in memory refresh to avoid old data persistence (avatar)
    socket.handshake.user.username = user.username;
    socket.handshake.user.avatar = user.avatar;

    user.populate('onetoones', 'username', function(err, user) {
      if (err) helper.handleError('Unable to populate user: '+err);

      // Onetoones list
      var onetoones = user.onetoonesList();

      // Welcome
      socket.emit('welcome', {
        user: {
          user_id: socket.getUserId(),
          username: socket.getUsername(),
          avatar: socket.getAvatar()
        },
        rooms: user.rooms,
        onetoones: onetoones
      });
    });
  });

  // Push this user to other users
  socket.broadcast.emit('user:online', {
    user_id: socket.getUserId(),
    username: socket.getUsername(),
    avatar: socket.getAvatar('medium')
  });

  // Activity
  helper.record('connection', socket, {});
};