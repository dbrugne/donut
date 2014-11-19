var async = require('async');
var helper = require('./helper');
var logger = require('../app/models/log');
var Room = require('../app/models/room');

module.exports = function (io, socket) {

  var start = logger.start();

  async.waterfall([

      function rooms(callback) {

        var q = Room.find({})
          .sort({priority: -1, 'lastjoin_at': -1})
          .limit(100)
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
              lastjoin_at: new Date(room.lastjoin_at).getTime(),
              priority   : room.priority || 0
            };

            _rooms.push(_data);
          });

          // sort (priority, users, lastjoin_at, name)
          _rooms.sort(function(a, b) {
            if (a.priority != b.priority)
              return b.priority - a.priority;

            if (a.users != b.users)
              return (b.users - a.users); // b - a == descending

            if (a.avatar && !b.avatar)
              return -1;
            else if (!a.avatar && b.avatar)
              return 1;
            else
              return 0;

            if (a.lastjoin_at != b.lastjoin_at)
              return (b.lastjoin_at - a.lastjoin_at); // b - a == descending

            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          });

          return callback(null, _rooms);
        });

      },

      function onlines(rooms, callback) {
        helper.users(io, 200, function(err, onlines) {
          if (err)
            return callback(err);

          return callback(null, rooms, onlines);
        });
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

      logger.log('home', socket.getUsername(), null, start);
    }
  );

};
