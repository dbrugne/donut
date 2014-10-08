var async = require('async');
var helper = require('./helper');
var Room = require('../app/models/room');

module.exports = function (io, socket) {

  async.waterfall([

      function rooms(callback) {

        var q = Room.find({})
          .sort({'lastjoin_at': -1})
          .limit(25)
          .populate('owner', 'username avatar');

        q.exec(function (err, rooms) {
          if (err)
            return callback('Error while retrieving home rooms: ' + err);

          var _rooms = [];
          helper._.each(rooms, function (room) {
            var _owner = {};
            if (room.owner != undefined) {
              _owner = {
                user_id : room.owner._id.toString(),
                username: room.owner.username
              };
            }

            var count = (room.users)
              ? room.users.length
              : 0;

            var _data = {
              name       : room.name,
              topic      : room.topic,
              description: room.description,
              color      : room.color,
              avatar     : room.avatar,
              owner      : _owner,
              users      : count
            };

            _rooms.push(_data);
          });

          return callback(null, _rooms);
        });

      },

      function onlines(rooms, callback) {
        var onlines = helper.connectedUsers(io, 200);
        return callback(null, rooms, onlines);
      },

      function send(rooms, onlines, callback) {

        var event = {
          rooms: rooms,
          users: onlines
        };

        socket.emit('home', event);

        return callback(null, event);
      }

    ], function(err, event) {
      if (err)
        return helper.handleError(err);

      helper.record('home', socket, {});
    }
  );

};
