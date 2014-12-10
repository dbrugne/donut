var async = require('async');
var _ = require('underscore');
var Room = require('../../../server/app/models/room');
var User = require('../../../server/app/models/user');
var retriever = require('../../../server/app/models/historyroom').retrieve();

/**
 * Helper to retrieve/prepare all the room data needed for 'welcome' and
 * 'room:welcome' events:
 *   - room entity
 *   - owner
 *   - ops
 *   - users
 *   - history
 */
module.exports = function(app, uid, name, fn) {

  async.waterfall([

    function findRoom(callback) {
      var q = Room.findByName(name)
        .populate('owner', 'username avatar color facebook')
        .populate('op', 'username avatar color facebook')
        .exec(function(err, room) {
        if (err)
          return callback('Error while retrieving room: '+err);

        if (!room) {
          console.log('Unable to find this room, we skip: '+name);
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
        _.each(users, function(user) {
          list.push({
            user_id   : user._id.toString(),
            username  : user.username,
            avatar    : user._avatar(),
            color     : user.color
          });
        });

        return callback(null, room, list);
      });
    },

    function status(room, users, callback) {
      var uids = _.map(users, function(u) { return u.user_id; });
      app.statusService.getStatusByUids(uids, function(err, results) {
        if (err)
          return callback('Error while retrieving user status: '+err);

        _.each(users, function(element, index, list) {
          list[index].status = (results[element.user_id])
            ? 'online'
            : 'offline';
        });

        return callback(null, room, users);
      });
    },

    function history(room, users, callback) {
      // get last 250 events
      retriever(room.name, uid, null, function(err, history) {
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
        _.each(room.op, function(opUser) {
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