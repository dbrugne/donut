var async = require('async');
var helper = require('./helper');
var Room = require('../app/models/room');
var User = require('../app/models/user');
var retriever = require('../app/models/historyroom').retrieve();

/**
 * Helper to retrieve/prepare all the room data needed for 'welcome' and
 * 'room:welcome' events:
 *   - room entity
 *   - owner
 *   - ops
 *   - users
 *   - history
 */
module.exports = function(io, socket, name, fn) {

  async.waterfall([

    function findRoom(callback) {
      var q = Room.findByName(name)
        .populate('owner', 'username avatar color facebook')
        .populate('op', 'username avatar color facebook')
        .exec(function(err, room) {
        if (err)
          return callback('Error while retrieving room: '+err);

        if (!room) {
          helper.handleError('Unable to find this room, we skip: '+name);
          return fn(null, null);
        }

        return callback(null, room);
      });
    },

    function users(room, callback) {

      // http://docs.mongodb.org/manual/reference/operator/query/in/
      User.find({rooms: { $in: [room.name]}}, function(err, users) {
        if (err)
          return callback('Error while listing room users: '+err);

        var list = [];
        helper._.each(users, function(user) {
          var status = helper.isUserOnline(io, user._id.toString());
          list.push({
            user_id   : user._id.toString(),
            username  : user.username,
            avatar    : user._avatar(),
            color     : user.color,
            status    : (status) ? 'online' : 'offline'
          });
        });

        return callback(null, room, list);
      });
    },

    function history(room, users, callback) {
      // current day history only
      retriever(room.name, socket.getUserId(), 0, 0, function(err, history) {
        if (err)
          return callback(err);

        return callback(null, room, users, history);
      });
    },

    function prepare(room, users, history, callback) {
      var roomData = {
        name: room.name,
        owner: {},
        op: [],
        avatar: room.avatar,
        poster: room.poster,
        color: room.color,
        topic: room.topic,
        users: users,
        history: history
      };
      if (room.owner) {
        roomData.owner = {
          user_id: room.owner._id,
          username: room.owner.username
        };
      }
      if (room.op) {
        helper._.each(room.op, function(opUser) {
          roomData.op.push({
            user_id: opUser._id.toString(),
            username: opUser.username,
            avatar: opUser._avatar(),
            color: opUser.color
          });
        });
      }

      return callback(null, roomData);
    }

  ], function(err, roomData) {
    if (err)
      return fn(err);

    return fn(null, roomData);
  });

};