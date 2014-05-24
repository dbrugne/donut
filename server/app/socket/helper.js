var _ = require('underscore');
var Room = require('../models/room');
var activityRecorder = require('../activity-recorder');

module.exports = {

  /**
   * Search, create and return a room model:
   * - validate room name format
   * [- search for room in memory cache] @todo
   * - search for room in Mongo store (case-insensitive test)
   * - if not exist "create the room" in Mongo store [and memory cache] @todo
   * - callback
   * @param name
   * @returns {boolean}|Room
   */
  findCreateRoom: function(name, socket, success, error) {
    this.findRoom(name, function(room) {
      if (!room) { // create room if needed
        room = new Room({
          name: name,
          owner_id: socket.getUserId()
        });
        room.save(function (err, room, numberAffected) {
          if (err) return error('Unable to save room: '+err);

          success(room);
          activityRecorder('room:create', socket.getUserId(), {_id: room.get('_id'), name: room.get('name')});
        });
      } else {
        success(room);
      }
    }, error);
  },

  findRoom: function(name, success, error) {
    if (!Room.validateName(name)) return error('Invalid room name');

    Room.findByName(name).exec(function(err, room) {
      if (err) return error('Unable to Room.findByName: '+err);
      success(room);
    });
  },

  /**
   * List connected users (and not sockets)
   * @param io
   * @param limit
   * @return {Array}
   */
  connectedUsers: function(io, limit) {
    limit = limit ? limit : 10;

    var list = [];
    var already = [];
    var sockets = io.sockets.clients();
    var until = (sockets.length < limit) ? sockets.length : limit;
    for (var i=0; i < until; i++) {
      var u = sockets[i];
      if (!_.contains(already, u.getUserId())) {
        already.push(u.getUserId());
        list.push({
          user_id: u.getUserId(),
          username: u.getUsername()
        });
      }
    }
    return list;
  },

  socketUser: function(io, socket) {
    // @todo
    return [];
  },

  /**
   * * List room for a particular socket
   * @param io
   * @param socket
   * @returns {*}
   */
  socketRooms: function(io, socket) {
    var rawList = io.sockets.manager.roomClients[socket.id];
    var list = [];
    Object.keys(rawList).forEach(function(key) {
      if (key == '') return; // common room for all socket (socket.io)
      if (key.substring(0, 2) != '/#') return; // only our rooms

      var name = key.substring(1); // remove initial '/'
      list.push(name);
    });
    return list;
  },

  /**
   * List sockets for a particular user (id)
   * @param io
   * @param userId
   * @returns {Array}
   */
  userSockets: function(io, userId) {
    return this.roomSockets(io, 'user:'+userId);
  },

  /**
   * List room for a particular user_id
   * Based on first socket found for this user (all the user socket should have
   * same subscriptions)
   * @param io
   * @param userId
   * @returns {Array}
   */
  userRooms: function(io, userId) {
    var socket = this.userSockets(io, userId)[0]; // take first
    return this.socketRooms(io, socket);
  },

  /**
   * List room de-duplicated sockets list (and not room.users or only socket list)
   * @param io
   * @param name
   * @returns {Array}
   */
  roomUsers: function(io, name) {
    var list = [];
    var already = [];
    var sockets = io.sockets.clients(name);
    for (var i=0; i < sockets.length; i++) {
      var u = sockets[i];
      if (!_.contains(already, u.getUserId())) {
        already.push(u.getUserId());
        list.push({
          user_id: u.getUserId(),
          username: u.getUsername()
        });
      }
    }
    return list;
  },

  /**
   * List sockets in a particular room
   * @param name
   * @returns {Array}
   */
  roomSockets: function(io, name) {
    return io.sockets.clients(name);
  }

};