var _ = require('underscore');
var debug = require('debug')('chat-server');
var configuration = require('../config/index');
var User = require('../app/models/user');
var Room = require('../app/models/room');
var Activity = require('../app/models/activity');
var HistoryRoom = require('../app/models/history_room');
var sanitize = require('sanitize-caja');
var expressValidator = require('../app/validator');

module.exports = {

  _: _,

  /**
   * Handle error triggered in socket logics
   * @param err
   */
  handleError: function(err) {
    debug('Error triggered: '+err);
  },

  history: {
    room: HistoryRoom.recorder()
  },

  /**
   * Add a new record in the activity log in database
   * @param type
   * @param user_id
   * @param data
   * @param receivers
   */
  record: function(type, socket, data, receivers) {
    if (data == undefined) {
      data = {};
    }
    var user_id = (socket != '')
     ? socket.getUserId()
     : '';
    var activity = new Activity({
      type: type,
      user_id: user_id,
      data: data
    });

    if (receivers) activity.receivers = receivers;
    activity.save();

    var identity = (socket.getUsername)
      ? socket.getUsername()
      : ((socket.getUserId)
        ? socket.getUserId()
        : socket.id);
    debug('[ws] socket "'+identity+'" has "'+type+'"');
  },

  /**
   * Search and return user model:
   * [- search in memory cache] @todo
   * - search in Mongo
   * - callback
   * @param username
   * @param success
   * @param error
   */
  findUser: function(username, success, error) {
    if (!User.validateUsername(username)) return error('findUser invalid username: '+username);

    User.findByUsername(username).exec(function(err, user) {
      if (err) return error('Unable to retrieve user ' + err);
      if (!user) return error('Unable to retrieve this user: ' + username);

      success(user);
    });
  },

  /**
   * Method that search for a Room in database.
   * Can create it if needed.
   *
   * @param options
   * @private
   */
  _retrieveRoom: function(options) {
    var o = {
      name: '',
      socket: '',
      success: '',
      error: '',
      create: false
    };
    o = _.extend(o, options);

    if (o.name == '')
      return o.error('o.name not found');
    if (o.create === true && o.socket == '')
      return o.error('socket is needed for on-the-fly room creation');
    if (!Room.validateName(o.name))
      return o.error('Invalid room name: '+o.name);

    var populate = function(room, success, error) {
      room.populate('owner', 'username avatar', function(err, room) {
        if (err) return error('Unable to room.populate: '+err);
        success(room);
      });
    }

    var that = this;
    Room.findByName(o.name).exec(function(err, room) {
      if (err)
        return o.error('Unable to Room.findByName: '+err);
      if (!room) {
        if (o.create !== true) {
          return o.error('Room not found');
        }

        // Create Room
        room = new Room({
          name: o.name,
          owner: o.socket.getUserId(),
          color: configuration.room.default.color
        });
        room.save(function (err, room, numberAffected) {
          if (err) return o.error('Unable to create room: '+err);
          populate(room, o.success, o.error);
          that.record('room:create', o.socket, {_id: room.get('_id'), name: room.get('name')});
        });
      }

      populate(room, o.success, o.error);
    });
  },

  /**
   * ** alternative to _retrieveRoom, async compliant **
   *
   * Method that search for a Room in cache, database.
   *
   * @param options
   * @private
   */
  retrieveRoom: function(name, callback)  {
    if (!name)
      return callback('retrieveRoom: Name is mandatory');
    if (!Room.validateName(name))
      return callback('retrieveRoom: Invalid room name: '+name);

    var that = this;
    Room.retrieveRoom(name).exec(function(err, room) {
      if (err)
        return callback('retrieveRoom: Unable to run query: '+err);

      return callback(null, room);

    });
  },

  /**
   * Method that search for a Room in cache, database.
   * async compliant
   *
   * @param options
   * @private
   */
  retrieveUser: function(username, callback)  {
    if (!username)
      return callback('retrieveUser: Username is mandatory');
    if (!User.validateUsername(username))
      return callback('retrieveUser: Invalid username: '+username);

    var that = this;
    User.retrieveUser(username).exec(function(err, user) {
      if (err)
        return callback('retrieveUser: Unable to run query: '+err);

      return callback(null, user);

    });
  },

  /**
   * Search, create and return a room model:
   * - search room
   * - if not exist "create the room" in Mongo store [and memory cache] @todo
   * - callback
   * @param name
   * @param socket
   * @param success
   * @param error
   */
  findCreateRoom: function(name, socket, success, error) {
    this._retrieveRoom({
      name: name,
      socket: socket,
      success: success,
      error: error,
      create: true
    });
  },

  /**
   * Search and return room model:
   * - validate room name format
   * [- search for room in memory cache] @todo
   * - search for room in Mongo store (case-insensitive test)
   * - callback
   * @param name
   * @param success
   * @param error
   * @returns {*}
   */
  findRoom: function(name, success, error) {
    this._retrieveRoom({
      name: name,
      success: success,
      error: error
    });
  },

  /**
   * Check if the room corresponding to 'name' is empty (no socket) and if yes
   * remove it
   * @param io
   * @param name
   */
  deleteRoom: function(io, name) {
    // Room is empty?
    if (this.roomSockets(io, name).length < 1) {
      var that = this;
      Room.findOneAndRemove(
        {
          $and: [
            {name: name},
            {$or: [
              {permanent: { $exists: false }},
              {permanent: false}
            ]}
          ]},
        {select: 'name'},
        function(err, room) {
          if (err)
            return that.error('Unable to delete room: '+err);

          // a room was found
          if (room)
            that.record('room:delete', '', {_id: room.get('_id'), name: room.get('name')});
        }
      );
    }
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
    var sockets = io.sockets.adapter.nsp.connected;
    var until = (sockets.length < limit) ? sockets.length : limit;
    var keys = Object.keys(sockets);
    for (var i=0; i < until; i++) {
      var u = sockets[keys[i]];
      if (u) { // sometime socket has expired
        if (!_.contains(already, u.getUserId())) {
          already.push(u.getUserId());
          list.push({
            user_id: u.getUserId(),
            username: u.getUsername(),
            avatar: u.getAvatar(),
            color: u.getColor()
          });
        }
      }
    }
    return list;
  },

  /**
   * * List room for a particular socket
   * @param io
   * @param socket
   * @returns {*}
   */
  socketRooms: function(io, socket) {
    var list = [];

    // On disconnection socket is no longer present in io.sockets.adapter.nsp.connected
    // but still exist (socket)
    var rawList = [];
    if (io.sockets.adapter.nsp.connected[socket.id]) {
      rawList = io.sockets.adapter.nsp.connected[socket.id].rooms;
    } else if (socket.rooms) {
      rawList = socket.rooms;
    }

    if (!rawList || rawList.length < 1) return list;

    _.each(rawList, function(name) {
      if (!name) return; // common room for all socket (socket.io)
      if (name.substring(0, 1) != '#') return; // only our rooms
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

    if (!socket)
      return null;

    return this.socketRooms(io, socket);
  },

  /**
   * List room de-duplicated user_id list (and not simple room sockets list)
   * @param io
   * @param name
   * @returns {Array}
   */
  roomUsersId: function(io, name) {
    var list = this.roomUsers(io, name);

    var ids = [];
    _.each(list, function(o) {
      ids.push(o.user_id);
    });

    return ids;
  },

  /**
   * List room de-duplicated user list (and not simple room sockets list)
   * @param io
   * @param name
   * @returns {Array}
   */
  roomUsers: function(io, name) {
    var list = [];
    var already = [];
    var sockets = this.roomSockets(io, name);
    for (var i=0; i < sockets.length; i++) {
      var u = sockets[i];
      if (u) { // = socket has maybe expired
        if (!_.contains(already, u.getUserId())) {
          already.push(u.getUserId());
          list.push({
            user_id: u.getUserId(),
            username: u.getUsername(),
            avatar: u.getAvatar(),
            color: u.getColor()
          });
        }
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
//    return io.sockets.in(name);
    // source: http://stackoverflow.com/questions/23858604/how-to-get-rooms-clients-list-in-socket-io-1-0
    // until a cleaner method is implemented in socket.io : https://github.com/Automattic/socket.io-redis/pull/15
    var res = [];
    var room = io.sockets.adapter.rooms[name];
    if (room) {
      for (var id in room) {
        res.push(io.sockets.adapter.nsp.connected[id]);
      }
    }
    return res;
  },

  /**
   * Return true if provided 'socket' is in 'room'
   * @param socket
   * @param name
   * @return boolean
   */
  isSocketInRoom: function(io, socket, name) {
    if (this.socketRooms(io, socket).indexOf(name) == -1) return false;
    else return true;
  },

  /**
   * Return true if provided 'user' is in 'room'
   * @param userId
   * @param name
   * @return boolean
   */
  isUserInRoom: function(io, userId, name) {
    if (this.userRooms(io, userId.toString()).indexOf(name) == -1) return false;
    else return true;
  },

  isUserOnline: function(io, userId) {
    var sockets = this.userSockets(io, userId);
    return (sockets.length > 0)
      ? true
      : false;
  },

  /**
   * Return all user:message between userWith and socket.getUserId()
   * (both direction)
   * @param io
   * @param socket
   * @param withUserId
   * @param since (number of minutes from now)
   * @param success
   */
  userHistory: function(io, socket, withUserId, since, success) {
    var sinceMs = since * 1000 * 60; // since is in minutes
    var now = new Date();
    var sinceDate = now - sinceMs;

    var criteria = {
      type: 'user:message',
      $or: [
        {$and: [{'data.user_id': socket.getUserId()}, {'data.to_user_id': withUserId}]},
        {$and: [{'data.user_id': withUserId}, {'data.to_user_id': socket.getUserId()}]}
      ],
      time: {$gte: sinceDate}
    };

    var q = Activity.find(criteria).sort({time: -1}).limit(500);

    var that = this;
    var onResult = function(err, events) {
      if (err) return that.handleError('Unable to retrieve user:message history: '+err);
      var list = _.map(events, function(event) {
        var output = event.toJSON();
        output.data.type = output.type;
        return output.data;
      });
      list.reverse();
      return success(list);
    };

    q.exec(onResult);
  },

  /**
   * Return all room:message/in/out for name
   * @param io
   * @param socket
   * @param name
   * @param since (number of minutes from now)
   * @param success
   */
  roomHistory: function(io, socket, name, since, success) {

    var sinceMs = since * 1000 * 60; // since is in minutes
    var now = new Date();
    var sinceDate = now - sinceMs;

    var criteria = {
      type: { $in: ['room:message', 'room:in', 'room:out', 'room:topic'] },
      'data.name': name,
      receivers: { $in: [socket.getUserId()] },
      time: {$gte: sinceDate}
    };

    var q = Activity.find(criteria).sort({time: -1}).limit(500);

    var that = this;
    var onResult = function(err, events) {
      if (err) return that.handleError('Unable to retrieve room:history: '+err);

      var list = _.map(events, function(event) {
        var output = event.toJSON();
        output.data.type = output.type;
        return output.data;
      });
      list.reverse();
      return success(list);
    };

    q.exec(onResult);
  },

  /**
   * Check for maximal length, sanitize and escape input
   * Return filtered string or empty string if too long or empty.
   * @param value
   * @param max
   * @return '' or filtered String
   */
  inputFilter: function(value, maxLength) {
    maxLength = maxLength || 512;
    if (!expressValidator.validator.isLength(value, 1, 512))
      return '';

    var filtered;
    filtered = value.replace('<3', '#!#!#heart#!#!#').replace('</3', '#!#!#bheart#!#!#'); // very common but particular case
    filtered = sanitize(filtered);
    filtered = value.replace('#!#!#heart#!#!#', '<3').replace('#!#!#bheart#!#!#', '</3');
    return filtered;
    /**
     * Test string :
     *
     * words are :P >B) <3 </3 :) but style is still <strong>enabled</strong>, and <a href="http://google.com">links</a>. Or www.google.com and http://yahoo.fr/ with an XSS <script>alert('go go go!')</script>
     */
  },

  /**
   * Check that user is the room owner
   * @param io
   * @param room
   * @param user_id
   */
  isOwner: function(io, room, user_id) {
    if (!room.owner || !room.owner._id)
      return false;

    if (room.owner._id.toString() != user_id)
      return false;

    return true;
  },

  /**
   * Check that user is a room op
   * @param io
   * @param room
   * @param user_id
   */
  isOp: function(io, room, user_id) {
    if (!room || !room.op)
      return false;

    // non-hydrated room.op list
    if (room.op.indexOf(user_id) !== -1)
      return true;

    // hydrated room.op list
    var isIn = false;
    _.each(room.op, function(user) {
      if (user._id.toString() == user_id) {
        isIn = true;
      }
    });

    if (isIn)
      return true;

    return false;
  },

  /**
   * Check that user is the room owner or an op
   * @param io
   * @param room
   * @param user_id
   */
  isOwnerOrOp: function(io, room, user_id) {
    if (this.isOwner(io, room, user_id) || this.isOp(io, room, user_id))
      return true;

    return false;
  }

};