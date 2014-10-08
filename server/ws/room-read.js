var async = require('async');
var helper = require('./helper');
var Room = require('../app/models/room');

module.exports = function(io, socket, data) {

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback("room:read 'name' is mandatory");
      if (!Room.validateName(data.name))
        return callback('room:read Invalid room name: '+data.name);

      return callback(null);
    },

    function retrieve(callback) {

      Room.retrieveRoom(data.name)
        .populate('users', 'username avatar color facebook')
        .exec(function(err, room) {
        if (err)
          return callback('Error while retrieving room in room:read: '+err);

        return callback(null, room);
      });

    },

    function send(room, callback) {

      // owner
      var owner = {};
      if (room.owner) {
        owner = {
          user_id: room.owner._id,
          username: room.owner.username,
          avatar: room.owner._avatar(),
          color: room.owner.color
        };
      }

      // op
      var ops = [];
      if (room.op && room.op.length > 0) {
        helper._.each(room.op, function(op) {
          ops.push({
            user_id: op._id.toString(),
            username: op.username,
            avatar: op._avatar(),
            color: op.color
          });
        });
      }

      // users
      var users = [];
      if (room.users && room.users.length > 0) {
        helper._.each(room.users, function(u) {
          users.push({
            user_id: u._id.toString(),
            username: u.username,
            avatar: u._avatar(),
            color: u.color
          });
        });
      }

      var event = {
        name: room.name,
        owner: owner,
        op: ops,
        users: users,
        avatar: room.avatar,
        poster: room.poster,
        color: room.color,
        website: room.website,
        topic: room.topic,
        description: room.description,
        created: room.created_at
      };
      socket.emit('room:read', event);

      return callback(null, room, event);

    }

  ], function(err, room, event) {
    if (err)
      return helper.handleError(err);

    // Activity
    helper.record('room:read', socket, event);

  });

};
