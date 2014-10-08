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
              users      : count,
              lastjoin_at: new Date(room.lastjoin_at).getTime()
            };

            _rooms.push(_data);
          });

          // sort (users, lastjoin_at, name)
          _rooms.sort(function(a, b) {
            if (a.users != b.users)
              return (b.users - a.users); // b - a == descending

            if (a.lastjoin_at != b.lastjoin_at)
              return (b.lastjoin_at - a.lastjoin_at); // b - a == descending

            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
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
