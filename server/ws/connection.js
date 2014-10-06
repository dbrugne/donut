var async = require('async');
var helper = require('./helper');
var User = require('../app/models/user');
var Room = require('../app/models/room');
var hello = require('../app/hello-dolly');
var conf = require('../config/index');
var roomDataHelper = require('./_room-data.js');

module.exports = function(io, socket) {

  // Decorate socket (shortcut)
  socket.getUser = function() {
    return this.request.user;
  };
  socket.getUserId = function() {
    return this.request.user._id.toString();
  };
  socket.getUsername = function() {
    return this.request.user.username;
  };
  socket.getAvatar = function() {
    return this.request.user._avatar();
  };
  socket.getPoster = function() {
    return this.request.user.poster;
  };
  socket.getColor = function() {
    return this.request.user.color;
  };

  socket.helper = require('./helper-socket')(io);

  async.waterfall([

    function addSocketToUserRoom(callback) {
      // create a virtual room by user
      socket.join('user:'+socket.getUserId(), function() {
        return callback(null);
      });
    },

    function retrieveUser(callback){
      User.findById(socket.getUserId(), function(err, user) {
        if (err)
          return callback('Unable to find user: '+err, null);

        if (user.general == true && user.rooms.indexOf(conf.room.general) == -1) {
          User.findOneAndUpdate({_id: socket.getUserId()}, {$addToSet: { rooms: conf.room.general }}, function(err, user) {
            if (err)
              return callback('Unable to persist #donut on user: '+err);

            return callback(null, user);
          });
        } else {
          return callback(null, user);
        }

      });
    },

    function populateOnes(user, callback){
      // @todo later:  pass non received user:message for this user (messages send when user was offline)
      return callback(null, user);
    },

    function populateRooms(user, callback) {
      if (user.rooms.length < 1)
        return callback(null, user);

      var parallels = [];
      helper._.each(user.rooms, function(name) {
        parallels.push(function(fn) {
          var roomData = roomDataHelper(io, socket, name, function(err, room) {
            if (err)
              return fn(err);
            else
              return fn(null, room);
          });
        });
      });
      async.parallel(parallels, function(err, results) {
        if (err)
          return callback('Error while populating rooms: '+err);

        user.roomsToSend = helper._.filter(results, function(r) {
          return r !== null;
        });
        return callback(null, user);
      });
    },

    function subscribeSocket(user, callback) {
      helper._.each(user.roomsToSend, function(room) {
        // Inform other room users
        var roomInEvent = {
          name: room.name,
          time: Date.now(),
          user_id: socket.getUserId(),
          username: socket.getUsername(),
          avatar: socket.getAvatar(),
          color: socket.getColor()
        };
        io.to(room.name).emit('room:in', roomInEvent);

        socket.join(room.name);
        console.log('socket '+socket.id+' subscribed to room '+room.name);
      });

      return callback(null, user);
    },

    function emitWelcome(user, callback) {
      socket.emit('welcome', {
        hello: hello(),
        user: {
          user_id: user._id.toString(),
          username: user.username,
          avatar: user._avatar(),
          color: user.color
        },
        rooms: user.roomsToSend // problem when using directly user.rooms on mongoose model
      });

      return callback(null, user);
    }

  ], function (err, user) {
    if (err)
      return helper.handleError(err);

    // push this user to other users (only for first socket)
    if (helper.userSockets(io, socket.getUserId()).length == 1) {
      // @todo : only populated rooms and onetoone users sockets
      socket.broadcast.emit('user:online', {
        user_id: socket.getUserId(),
        time: Date.now(),
        username: socket.getUsername(),
        avatar: socket.getAvatar(),
        color: socket.getColor()
      });
    }

    // activity
    helper.record('connection', socket, {});
  });
};