var debug = require('debug')('chat-server:connection');
var async = require('async');
var helper = require('./helper');
var User = require('../app/models/user');
var Room = require('../app/models/room');
var hello = require('../app/hello-dolly');
var conf = require('../config/index');
var roomDataHelper = require('./_room-data.js');
var roomEmitter = require('./_room-emitter');

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

  // welcome event data
  var welcome = {
    hello: hello()
  };

  // room:in / user:online event
  var inEvent = {
    user_id: socket.getUserId(),
    username: socket.getUsername(),
    avatar: socket.getAvatar(),
    color: socket.getColor()
  };

  async.waterfall([

    function retrieveUser(callback){
      User.findById(socket.getUserId(), function(err, user) {
        if (err)
          return callback('Unable to find user: '+err, null);

        return callback(null, user);
      });
    },

    function addSocketToUserRoom(user, callback) {
      // create a virtual room by user
      socket.join('user:'+user._id.toString(), function() {
        return callback(null, user);
      });
    },

    function generalRoom(user, callback) {
      // special case of #donut room autojoin
      if (user.general == true && user.rooms.indexOf(conf.room.general) == -1) {
        User.findOneAndUpdate({_id: user._id}, {$addToSet: { rooms: conf.room.general }}, function(err, user) {
          if (err)
            return callback('Unable to persist #donut on user: '+err);

          Room.findOneAndUpdate({name: conf.room.general}, {$addToSet: {users: user._id}}, function(err) {
            if (err)
              return callback('Unable to persist user on #donut: '+err);

//            user.newToGeneral = true;

            // Inform other room users (user:online)
            roomEmitter(io, conf.room.general, 'room:in', inEvent, function(err) {
              return callback(err, user);
            });
          });
        });
      } else {
        return callback(null, user);
      }
    },

    function populateOnes(user, callback){
      // @todo:  pass non received user:message for this user (messages send when user was offline)
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

        welcome.rooms = helper._.filter(results, function(r) {
          return r !== null;
        });
        return callback(null, user);
      });
    },

    function subscribeSocket(user, callback) {
      var roomsToInform = [];
      helper._.each(welcome.rooms, function(room) {
        // Add socket to the room
        socket.join(room.name);
        debug('socket '+socket.id+' subscribed to room '+room.name);

        // Add room to notification list
        roomsToInform.push(room.name);
      });

      // Inform other room users (user:online, only for first socket)
      if (helper.userSockets(io, socket.getUserId()).length == 1) {
        roomEmitter(io, roomsToInform, 'user:online', inEvent, function (err) {
          return callback(err, user);
        });
      } else {
        return callback(null, user);
      }
    },

    /**
     * @todo : dedicated steps to inform rooms and onetones users (with user:online)
     */

    function emitWelcome(user, callback) {
      welcome.user = {
        user_id: user._id.toString(),
        username: user.username,
        avatar: user._avatar(),
        color: user.color
      };
      socket.emit('welcome', welcome);

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