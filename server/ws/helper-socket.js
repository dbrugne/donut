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
      // persist on mongo user (last connect)

      // call calback
    },

    remUserOnline: function(fn) {
      // srem user in Redis connected SET ONLY IF LAST USER SOCKET (check user: room for that)

      // call calback
    },

    addUserInRoom: function(name, fn) {
      // sadd user in Redis room SET
      // persist in Mongo on room
      // join socket to sio room
        // same for other user sockets

      // call calback
    },
    remUserInRoom: function(name, fn) {
      // srem user in Redis room SET
      // persist in Mongo
      // leave socket to sio room
      // same for other user sockets

      // call calback
    },

    connectedUsers: function(fn) {
      // read Redis connected SET
    },

    roomUsers: function(name, fn) {
      // read Redis room users set
    },

    roomUsersCount: function(name, fn) {
      // read Redis room users set
    }

  };
};