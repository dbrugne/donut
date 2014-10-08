var async = require('async');
var helper = require('./helper');
var Room = require('../app/models/room');
var User = require('../app/models/user');

module.exports = function (io, socket, data) {

  if (!data.search)
   return;

  var pattern = data.search.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  var regexp = new RegExp(pattern, "i");

  async.parallel([

      function roomSearch(callback) {

        var search = {
          name: regexp
//          $or: [
//            { name: regexp },
//            { description: regexp }
//          ]
        };

        var q = Room
          .find(search, 'name owner description topic avatar color users lastjoin_at')
          .sort({'lastjoin_at': -1})
          .populate('owner', 'username');
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

            var count = (room.users)
              ? room.users.length
              : 0;

            results.push({
              name: room.name,
              owner: owner,
              description: room.description,
              topic: room.topic,
              avatar: room.avatar,
              color: room.color,
              users: count,
              lastjoin_at: new Date(room.lastjoin_at).getTime()
            });
          });

          // sort (users, lastjoin_at, name)
          results.sort(function(a, b) {
            if (a.users != b.users)
              return (b.users - a.users); // b - a == descending

            if (a.lastjoin_at != b.lastjoin_at)
              return (b.lastjoin_at - a.lastjoin_at); // b - a == descending

            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          });

          return callback(null, results);
        });

      },

      function userSearch(callback) {

        var search = {
          username: regexp
        };

        var q = User.find(search, 'username avatar color facebook');
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
              avatar: user._avatar(),
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
