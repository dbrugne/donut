var async = require('async');
var helper = require('./helper');
var User = require('../app/models/user');
var Room = require('../app/models/room');
var hello = require('../app/hello-dolly');
var conf = require('../config/index');

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

        if (user.general == true && user.rooms.indexOf(conf.room.general) == -1)
          user.rooms.push(conf.room.general);

        return callback(null, user);
      });
    },

    function populateOnes(user, callback){
      // @todo later:  pass non received user:message for this user (messages send when user was offline)
      return callback(null, user);
    },

    function populateRooms(user, callback){
      if (user.rooms.length < 1)
        return callback(null, user);

      // @todo: bug, if some user.rooms not still exist the socket is subscribed
      // to this room, and the room list persist in user.rooms
      // but the user IHM never get this rooms in welcome.rooms
      // => until he joins the room and leave the room they persist in user db
      //    entity
      var q = Room.find({name: { $in: user.rooms } })
            .populate('owner', 'username avatar');

      q.exec(function(err, rooms) {
        if (err)
          return callback('Unable to retrieve user rooms data: '+err, null);

        if (rooms.length < 1) {
          user.rooms = [];
          return callback(null, user);
        }

        var userRooms = [];
        for (var i = 0; i < rooms.length; i++) {
          var room = rooms[i];

          var users = helper.roomUsers(io, room.name);
          users.push({ // add myself, not already subscribed
            user_id: socket.getUserId(),
            username: socket.getUsername(),
            avatar: socket.getAvatar(),
            color: socket.getColor()
          });

          var roomData = {
            name: room.name,
            owner: {},
            op: room.op || [],
            avatar: room.avatar,
            poster: room.poster,
            color: room.color,
            topic: room.topic || '',
            users: users
          };
          if (room.owner) {
            roomData.owner = {
              user_id: room.owner._id,
              username: room.owner.username
            };
          }

          userRooms.push(roomData);

          // Last join date
          room.lastjoin_at = Date.now();
          room.save(function(err) {
            if (err)
              console.log('Error while saving lastjoin_at on room: '+err);
          });
        }

        user.roomsToSend = userRooms;
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

        socket.join(room.name); // automatic socket subscription to user rooms
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

    // push this user to other users
    socket.broadcast.emit('user:online', {
      user_id: socket.getUserId(),
      username: socket.getUsername(),
      avatar: socket.getAvatar()
    });

    // activity
    helper.record('connection', socket, {});
  });
};