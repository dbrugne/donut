var delegate_error = require('./error');
var User = require('../models/user');
var activityRecorder = require('../activity-recorder');
var _ = require('underscore');

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
  User.findById(socket.getUserId(), 'rooms onetoones', function(err, user) {
    if (err) {
      delegate_error(err, __dirname+'/'+__filename);
      user.rooms = [];
    }

    user.populate('onetoones', 'username', function(err, user) {
      if (err) return console.log(err);

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

      var onetoones = [];
      _.each(user.onetoones, function(userDb) {
        onetoones.push(userDb.username);
      });
      console.log(onetoones);

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
          rooms: ['#toulouse', '#paintball', '#dagnirDae'],
          users: onlines
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