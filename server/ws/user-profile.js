var async = require('async');
var helper = require('./helper');
var logger = require('../app/models/log');
var User = require('../app/models/user');
var Room = require('../app/models/room');

module.exports = function(io, socket, data) {

  var start = logger.start();

  if (!data.username)
    return helper.handleError('Param username is mandatory for user:profile');

  roomFields = 'name avatar color owner op';

  async.waterfall([

      function retrieve(callback) {

        helper.retrieveUser(data.username, function (err, user) {
          if (err)
            return callback('Error while retrieving user in user:profile: '+err);

          if (!user)
            return callback('Unable to retrieve user in user:profile: '+data.username);

          return callback(null, user);
        });

      },

      function userIsOwnerRooms(user, callback) {

        var roomsList = {
          owned: [],
          oped: [],
          joined: []
        };

        var q = Room.find({ owner: user._id }, roomFields);
        q.exec(function (err, rooms) {
          if (err)
            return callback('Error while retrieving user rooms (1) in user:profile: '+err);

          helper._.each(rooms, function(room) {
            roomsList.owned.push(room);
          });

          return callback(null, user, roomsList);
        });

      },

      function userIsOwnerOps(user, roomsList, callback) {

        var q = Room.find({ op: { $in: [user._id] } }, roomFields);
        q.exec(function (err, rooms) {
          if (err)
            return callback('Error while retrieving user rooms (2) in user:profile: '+err);

          helper._.each(rooms, function(room) {
            roomsList.oped.push(room);
          });

          return callback(null, user, roomsList);
        });

      },

      function userIsInRooms(user, roomsList, callback) {

        if (!user.rooms || user.rooms.length < 1)
          return callback(null, user, roomsList);

        var q = Room.find({ name: { $in: user.rooms } }, roomFields);
        q.exec(function (err, rooms) {
          if (err)
            return callback('Error while retrieving user rooms (3) in user:profile: '+err);

          helper._.each(rooms, function(room) {
            roomsList.joined.push(room);
          });

          return callback(null, user, roomsList);
        });

      },

      function send(user, roomsList, callback) {

        var userData = {
          user_id   : user._id.toString(),
          username  : user.username,
          color     : user.color,
          avatar    : user._avatar(),
          poster    : user.poster,
          bio       : user.bio,
          location  : user.location,
          website   : user.website,
          registered: user.created_at
        };

        // status
        userData.status = (helper.userSockets(io, user._id).length > 0)
          ? 'online'
          : 'offline';

        // rooms (mongoose => JSON)
        userData.rooms = {
          owned: [],
          oped: [],
          joined: []
        };
        helper._.each(Object.keys(roomsList), function(type) {
          helper._.each(roomsList[type], function(room) {
            var json = room.toJSON();
            userData.rooms[type].push(json);
          });
        });

        var event = { user: userData };
        socket.emit('user:profile', event);

        return callback(null, user, event);
      }

    ], function(err, user, event) {
      if (err)
        return helper.handleError(err);

      logger.log('user:profile', socket.getUsername(), data.username, start);
    }
  );

};
