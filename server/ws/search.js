var async = require('async');
var helper = require('./helper');
var Room = require('../app/models/room');
var User = require('../app/models/user');

module.exports = function (io, socket, data) {

  if (!data.search)
   return;

  var regexp = new RegExp(data.search, "i");

  async.parallel([

      function roomSearch(callback) {

        var search = {
          name: regexp
//          $or: [
//            { name: regexp },
//            { description: regexp }
//          ]
        };

        var q = Room.find(search, 'name permanent owner description topic avatar color').populate('owner', 'username');
        q.exec(function(err, rooms) {
          if (err)
            return callback('Error while searching for rooms: '+err);

          var results = [];
          helper._.each(rooms, function(room) {
            var owner = {};
            if (room.owner != undefined) {
              owner = {
                user_id: room.owner._id.toString(),
                username: room.owner.username
              };
            }
            results.push({
              name: room.name,
              permanent: room.permanent,
              owner: owner,
              description: room.description,
              topic: room.topic,
              avatar: room.avatar,
              color: room.color,
              users: helper.roomUsers(io, room.name).length
            });
          });

          return callback(null, results);
        });

      },

      function userSearch(callback) {

        var search = {
          username: regexp
        };

        var q = User.find(search, 'username avatar color');
        q.exec(function(err, users) {
          if (err)
            return callback('Error while searching for users: '+err);

          var results = [];
          helper._.each(users, function(user) {
            var status = (helper.userSockets(io, user._id.toString()).length)
              ? true
              : false;

            results.push({
              username: user.username,
              avatar: user.avatar,
              color: user.color,
              status: status
            });
          });

          return callback(null, results);
        });

      }

    ], function(err, results) {
      if (err)
        return helper.handleError(err);

      var searchEvent = {
        rooms: results[0],
        users: results[1]
      };

      socket.emit('search', searchEvent);

      // @todo : add a record in a dedicated statistic activity log (as for *:update)
    }
  );

};
