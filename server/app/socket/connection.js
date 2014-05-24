var error = require('./error');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');
var helper = require('./helper');

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
    return this.handshake.user._id.toString();
  }

  // Welcome data
  User.findById(socket.getUserId(), 'rooms onetoones', function(err, user) {
    if (err) {
      error('Unable to find user: '+err);
      user.rooms = [];
    }

    user.populate('onetoones', 'username', function(err, user) {
      if (err) error('Unable to populate user: '+err);

      // Online users list
      var onlines = helper.connectedUsers(io, 5);

      // Onetoones list
      var onetoones = user.onetoonesList();

      // Welcome
      socket.emit('welcome', {
        user: {
          user_id: socket.getUserId(),
          username: socket.getUsername()
        },
        rooms: user.rooms,
        onetoones: onetoones,
        onlines: onlines,
        home: {
          welcome: ["Vous trouverez sur cette page une liste des rooms existantes et des utilisateurs en ligne. N'hésitez pas à rejoindre notre chat de support #Aide pour toute question, remarque ou demande de fonctionnalité."],
          rooms: ['#toulouse', '#paintball', '#dagnirDae']
        }
      });
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