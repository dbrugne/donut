var async = require('async');
var helper = require('./helper');
var Room = require('../app/models/room');

module.exports = function(io, socket, data) {

  async.waterfall([

    function retrieve(callback) {

      helper.retrieveRoom(data.name, function (err, room) {
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
          avatar: room.owner.avatar,
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
            avatar: op.avatar,
            color: op.color
          });
        });
      }

      // users
      var users = helper.roomUsers(io, room.name);
      var users_count = users.length;
      // @todo : will need to read that better : having a global user count, and then get some (maybe 15 first) user hydrated

      var event = {
        name: room.name,
        owner: owner,
        op: ops,
        users: users,
        users_count: users_count,
        permanent: room.permanent,
        avatar: room.avatar,
        poster: room.poster,
        color: room.color,
        website: room.website,
        topic: room.topic,
        description: room.description
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
