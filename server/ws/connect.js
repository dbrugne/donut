var async = require('async');
var helper = require('./helper');
var logger = require('../app/models/log');
var User = require('../app/models/user');
var Room = require('../app/models/room');
var hello = require('../app/hello-dolly');
var conf = require('../config/index');
var roomDataHelper = require('./_room-data.js');
var oneDataHelper = require('./_one-data.js');
var roomEmitter = require('./_room-emitter');
var oneEmitter = require('./_one-emitter');

module.exports = function(io, socket) {

  var start = logger.start();

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
  socket.isAdmin = function() {
    return (this.request.user.admin === true);
  };

  // welcome event data
  var welcome = {
    hello: hello()
  };

  //// client unique ID
  //if (socket.handshake.query && socket.handshake.query.clientId && socket.handshake.query.clientId != '') {
  //  console.log('clientId: '+socket.handshake.query.clientId);
  //} else {
  //  console.log('clientId unknown (??)');
  //}

  // :in / :online
  var userEvent = {
    user_id: socket.getUserId(),
    username: socket.getUsername(),
    avatar: socket.getAvatar(),
    color: socket.getColor()
  };

  async.waterfall([

    function retrieveUser(callback){
      var q = User.findById(socket.getUserId());
      q.populate('onetoones', 'username');
      q.exec(function(err, user) {
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

    function donutRoom(user, callback) {
      // special case of #donut room autojoin
      if (user.general == true && user.rooms.indexOf(conf.room.general) == -1) {
        User.findOneAndUpdate({_id: user._id}, {$addToSet: { rooms: conf.room.general }}, function(err, user) {
          if (err)
            return callback('Unable to persist #donut on user: '+err);

          Room.findOneAndUpdate({name: conf.room.general}, {$addToSet: {users: user._id}}, function(err) {
            if (err)
              return callback('Unable to persist user on #donut: '+err);

            // Inform other #donut users (user:online)
            roomEmitter(io, conf.room.general, 'room:in', userEvent, function(err) {
              return callback(err, user);
            });
          });
        });
      } else {
        return callback(null, user);
      }
    },

    function populateOnes(user, callback){
      if (user.onetoones.length < 1)
        return callback(null, user);

      var parallels = [];
      helper._.each(user.onetoones, function(one) {
        if (!one.username)
          return console.log('Empty username found in populateOnes for user: '+socket.getUserId());
        parallels.push(function(fn) {
          oneDataHelper(io, socket, one.username, function(err, one) {
            if (err)
              return fn(err);
            else
              return fn(null, one);
          });
        });
      });
      async.parallel(parallels, function(err, results) {
        if (err)
          return callback('Error while populating onetoones: '+err);

        welcome.onetoones = helper._.filter(results, function(o) {
          return o !== null;
        });
        return callback(null, user);
      });
    },

    function populateRooms(user, callback) {
      if (user.rooms.length < 1)
        return callback(null, user);

      var parallels = [];
      helper._.each(user.rooms, function(name) {
        parallels.push(function(fn) {
          roomDataHelper(io, socket, name, function(err, room) {
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

    function persistOnliness(user, callback) {
      user.set('lastonline_at', Date.now());
      user.set('online', true);
      user.save(function(err) {
        if (err)
          return callback('Error while updating user onliness: '+err);

        return callback(null, user)
      });
    },

    function emitUserOnlineToRooms(user, callback) {
      // user:online, only for first socket
      if (helper.userSockets(io, socket.getUserId()).length > 1)
        return callback(null, user);

      var roomsToInform = [];
      helper._.each(welcome.rooms, function(room) {
        if (!room || !room.name)
          return;

        roomsToInform.push(room.name);
      });

      if (roomsToInform.length < 1)
        return callback(null, user);

      roomEmitter(io, roomsToInform, 'user:online', userEvent, function (err) {
        if (err)
          return callback(err);

        return callback(null, user);
      });
    },

    function emitUserOnlineToOnes(user, callback) {
      // user:online, only for first socket
      if (helper.userSockets(io, socket.getUserId()).length > 1)
        return callback(null, user);

      User.find({onetoones: { $in: [socket.getUserId()] }}, 'username', function(err, ones) {
        if (err)
          return callback('Unable to find onetoones to inform on connection: '+err);

        var onesToInform = [];
        helper._.each(ones, function(one) {
          if (!one || !one.username)
            return;

          onesToInform.push({from: socket.getUserId(), to: one._id.toString()});
        });

        if (onesToInform.length < 1)
          return callback(null, user);

        oneEmitter(io, onesToInform, 'user:online', userEvent, function (err) {
          if (err)
            return callback(err);

          return callback(null, user);
        });
      });
    },

    function emitWelcome(user, callback) {
      // welcome message is displayed until user hasn't check the box
      var welcomeMessage = (user.welcome === true || user.welcome == undefined)
        ? true
        : false;
      welcome.user = {
        user_id: user._id.toString(),
        username: user.username,
        avatar: user._avatar(),
        color: user.color,
        welcome: welcomeMessage
      };
      socket.emit('welcome', welcome);

      return callback(null, user);
    },

    function subscribeSocket(user, callback) {
      helper._.each(welcome.rooms, function(room) {
        // Add socket to the room
        socket.join(room.name);
      });
      return callback(null, user);
    }

  ], function (err, user) {
    if (err)
      return helper.handleError(err);

    logger.log('connect', socket.getUsername(), '', start);
  });
};