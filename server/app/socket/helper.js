var debug = require('debug')('chat-server');
var _ = require('underscore');
var sanitize = require('sanitize-caja');
var expressValidator = require('../validator');
var User = require('../models/user');
var Room = require('../models/room');
var Activity = require('../models/activity');

module.exports = {

  /**
   * Handle error triggered in socket logics
   * @param err
   */
  handleError: function(err) {
    debug('Error triggered: '+err);
  },

  /**
   * Add a new record in the activity log in database
   * @param type
   * @param user_id
   * @param data
   */
  record: function(type, socket, data) {
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
    activity.save();
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
    if (!User.validateUsername(username)) return error('Invalid username');

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
      return o.error('Invalid room name');

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
          permanent: false
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
        {$and: [{name: name}, {permanent: false}]},
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
    var sockets = io.sockets.clients();
    var until = (sockets.length < limit) ? sockets.length : limit;
    for (var i=0; i < until; i++) {
      var u = sockets[i];
      if (!_.contains(already, u.getUserId())) {
        already.push(u.getUserId());
        list.push({
          user_id: u.getUserId(),
          username: u.getUsername(),
          avatar: u.getAvatar('medium')
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
    var list = [];

    var rawList = io.sockets.manager.roomClients[socket.id];
    if (!rawList || rawList.length < 1) return list;

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
          username: u.getUsername(),
          avatar: u.getAvatar()
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
  },

  /**
   *
   * @param socket
   * @param name
   * @return boolean
   */
  isSocketInRoom: function(io, socket, name) {
    if (this.socketRooms(io, socket).indexOf(name) == -1) return false;
    else return true;
  },


  homeData: function(success) {
    var data = {};

    data.rooms = [];
    data.welcome = "Vous trouverez sur cette page une liste des rooms existantes "
                    +"et des utilisateurs en ligne."
                    +"N'hésitez pas à rejoindre notre chat de support #Support "
                    +"pour toute question, remarque ou demande de fonctionnalité.";

//    var q = Room.find({}, 'name owner permanent topic avatar color')
//      .populate('owner', 'username avatar');
//
//    var that = this;
//    var onResult = function(err, rooms) {
//      if (err) return that.handleError('Unable to retrieve room list: '+err);
//      if (rooms.length < 1) return success(data);
//
//      for (var i=0; i<rooms.length; i++) {
//        var room = rooms[i];
//        var roomData = {
//          name: room.name,
//          permanent: room.permanent,
//          topic: room.topic,
//          color: room.color,
//          avatar: room.avatar,
//          owner: {
//            user_id: room.owner._id.toString(),
//            username: room.owner.username,
//            avatar: room.owner.avatar
//          },
//          users: 0
//        };
//
//        roomData.users = that.roomUsers.length;
//        data.rooms.push(roomData);
//      }
//
//      return success(data);
//    };

//    q.exec(onResult);
    data.rooms = [
      {name: '#toulouse', topic: "Ce soir c'est cassoulet !!", color: '#FF0000', avatar: 'https://pbs.twimg.com/profile_images/697870595/VFTD_twitter2_bigger.jpg', permanent: true, owner: { user_id: 'fakeid', username: 'yangs'}, users: 10 },
      {name: '#paintball', topic: "Le Lorem Ipsum est simplement du faux texte employé dans la composition et la mise en page avant impression. Le Lorem Ipsum est le faux texte standard.", color: '#CCCCCC', avatar: 'https://pbs.twimg.com/profile_images/220364439/Oliver_Lang_5-09_437-lo_bigger.jpg', permanent: true, owner: {user_id: 'fakeid', username: 'DavidH.'}, users: 2},
      {name: '#dagnirDae', topic: "", color: '#0084B4', avatar: 'https://pbs.twimg.com/profile_images/1447728498/image.php_bigger.jpeg', permanent: false, owner: {user_id: 'fakeid', username: 'yangs'}, users: 120},
      {name: '#Support', topic: "Demandez !", color: '', avatar: 'https://pbs.twimg.com/profile_images/697870595/VFTD_twitter2_bigger.jpg', permanent: true, owner: {user_id: 'fakeid', username: 'roomly-official'}, users: 9},
      {name: '#businessParis', topic: "CAC 40 +0.03pts, bien mais pas top", color: 'yellow', avatar: '', permanent: true, owner: {user_id: 'fakeid', username: 'DavidH.'}, users: 15},
      {name: '#stringsAGogo', topic: "SPRING-BREAK", color: 'pink', avatar: 'https://pbs.twimg.com/profile_images/378800000548355775/85e692a450ffe554d78b19a847672086_bigger.jpeg', permanent: false, owner: {user_id: 'fakeid', username: 'néné'}, users: 20}
    ];
    return success(data);
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
  }

};