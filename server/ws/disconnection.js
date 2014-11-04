var async = require('async');
var helper = require('./helper');
var User = require('../app/models/user');
var roomEmitter = require('./_room-emitter');
var oneEmitter = require('./_one-emitter');

module.exports = function(io, socket) {

  // At least an other socket is live for this user or not
  var lastSocket = (helper.userSockets(io, socket.getUserId()).length < 1)
    ? true
    : false;

  // :out / :offline
  var userEvent = {
    user_id   : socket.getUserId(),
    username  : socket.getUsername(),
    avatar    : socket.getAvatar(),
    color     : socket.getColor()
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

    function emitUserOnlineToRooms(user, callback) {
      if (!lastSocket)
        return callback(null, user);

      var roomsToInform = [];
      helper._.each(user.rooms, function(name) {
        if (!name)
          return;

        roomsToInform.push(name);
      });

      if (roomsToInform.length < 1)
        return callback(null, user);

      roomEmitter(io, roomsToInform, 'user:offline', userEvent, function (err) {
        if (err)
          return callback(err);

        return callback(null, user);
      });
    },

    function emitUserOnlineToOnes(user, callback) {
      if (!lastSocket)
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

        oneEmitter(io, onesToInform, 'user:offline', userEvent, function (err) {
          if (err)
            return callback(err);

          return callback(null, user);
        });
      });
    }

  ], function(err, event) {
    if (err)
      return helper.handleError(err);

    // Activity
    helper.record('disconnect', socket);
  });

};
