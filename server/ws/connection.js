var async = require('async');
var helper = require('./helper');
var User = require('../app/models/user');
var Room = require('../app/models/room');

module.exports = function(io, socket) {

  // Decorate socket (shortcut)
  // @todo : add robustness code in following methods, sometimes (in debug session for example) the socket expires,
  // but the object still exists, and calling this.[handshake.user._id.toString()] on a it throw a :
  //    TypeError: Cannot read property 'user' of undefined
  socket.getUser = function() {
    return this.request.user;
  };
  socket.getUserId = function() {
    return this.request.user._id.toString();
  };
  socket.getUsername = function() {
    return this.request.user.username;
  };
  socket.getAvatar = function(format) {
    return this.request.user.avatarUrl(format);
  };

  // Welcome data
  async.waterfall([

    function addSocketToUserRoom(callback) {
      // create a virtual room by user
      socket.join('user:'+socket.request.user._id, function() {
        return callback(null);
      });
    },

    function retrieveUser(callback){
      User.findById(socket.getUserId(), 'username avatar rooms onetoones', function(err, user) {
        if (err)
          return callback('Unable to find user: '+err, null);

        return callback(null, user);
      });
    },

    function populateOnes(user, callback){
      user.populate('onetoones', 'username avatar color', function(err, user) {
        if (err)
          return callback('Unable to populate user: '+err, null);

        if (user.onetoones.length < 1)
          return callback(null, user);

        var userOnes = [];
        for (var i = 0; i < user.onetoones.length; i++) {
          var one = user.onetoones[i];
          var status = (helper.userSockets(io, one._id).length > 0)
            ? true
            : false;

          userOnes.push({
            user_id: one._id,
            username: one.username,
            avatar: one.avatarUrl('medium'),
            status: status
          });
        }

        user.onesToSend = userOnes;
        return callback(null, user);
      });
    },

    function populateRooms(user, callback){
      if (user.rooms.length < 1)
        return callback(null, user);

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
            avatar: socket.getAvatar('medium')
          });

          var roomData = {
            name: room.name,
            owner: {},
            op: room.op || [],
            permanent: room.permanent,
            avatar: room.avatarUrl('large'),
            poster: room.posterUrl(),
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
        }

        user.roomsToSend = userRooms;
        return callback(null, user);
      });

    },

    function subscribeSocket(user, callback) { // @todo : case of non existing room
      for (var i = 0; i < user.rooms.length; i++) {
        var room = user.rooms[i];

        // Inform other room users
        var roomInEvent = {
          name: room,
          time: Date.now(),
          user_id: socket.getUserId(),
          username: socket.getUsername(),
          avatar: socket.getAvatar('medium')
        };
        io.to(room).emit('room:in', roomInEvent);

        socket.join(room); // automatic socket subscription to user rooms
        console.log('socket '+socket.id+' subscribed to room '+room);
      }

      return callback(null, user);
    },

    function emitWelcome(user, callback) {
      socket.emit('welcome', {
        user: {
          user_id: socket.getUserId(),
          username: socket.getUsername(),
          avatar: socket.getAvatar()
        },
        rooms: user.roomsToSend, // problem when using directly user.rooms on mongoose model
        onetoones: user.onesToSend
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
      avatar: socket.getAvatar('medium')
    });

    // activity
    helper.record('connection', socket, {});
  });
};