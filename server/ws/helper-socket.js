var _ = require('underscore');
var debug = require('debug')('chat-server');
var configuration = require('../config/index');
var User = require('../app/models/user');
var Room = require('../app/models/room');
var Activity = require('../app/models/activity');

// this == socket
module.exports = function (io) {
  return {

    _: _,

    addUserOnline: function(fn) {
      // sadd user in Redis connected SET
    },

    remUserOnline: function(fn) {
      // srem user in Redis connected SET ONLY IF LAST USER SOCKET
    },

    connectedUsers: function(fn) {
      // read Redis connected SET
    },

    addUserInRoom: function(name, fn) {
      // sadd user in Redis room SET
        // same for other user sockets
      // persist in Mongo
      // join socket to sio room

      // call calback
    },
    remUserInRoom: function(name, fn) {
      // srem user in Redis room SET
        // same for other user sockets
      // persist in Mongo
      // join socket to sio room

      // call calback
    },

    roomUsers: function(name, fn) {
      // read Redis set
    },

    roomUsersCount: function(name, fn) {
      // read Redis set
    }

  };
};