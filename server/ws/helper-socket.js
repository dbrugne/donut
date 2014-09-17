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

    connectedUsersCount: function(fn) {

    },

    addUserInRoom: function(fn) {
      // sadd user in room
      // join
    },

    roomUsers: function(name, fn) {

    },

    roomUsersCount: function(name, fn) {

    },

    roomUsersCount: function(name, fn) {

    },

    isUserOnline: function(user_id, fn) {

    }

  };
};