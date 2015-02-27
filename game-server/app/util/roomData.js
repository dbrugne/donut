var logger = require('../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Room = require('../../../shared/models/room');
var User = require('../../../shared/models/user');

/**
 * Helper to retrieve/prepare all the room data needed for 'welcome' and
 * 'room:welcome' events:
 *   - room entity
 *   - owner
 *   - ops
 */
module.exports = function(app, uid, name, fn) {
  async.waterfall([

    function findRoom(callback) {
      var q = Room.findByName(name)
        .populate('owner', 'username avatar color facebook')
        .exec(function(err, room) {
        if (err)
          return callback('Error while retrieving room: '+err);

        if (!room) {
          logger.info('Unable to find this room, we skip: '+name);
          return fn(null, null);
        }

        return callback(null, room);
      });
    },

    function userIsBanned(room, callback) {
      if (!room.bans || !room.bans.length)
        return callback(null, room);

      var subDocument = _.find(room.bans, function(ban) {
        if (ban.user.toString() == uid)
          return true;
      });

      // not banned
      if (typeof subDocument == 'undefined')
        return callback(null, room);

      // banned
      logger.warn('User '+uid+' seems to be banned from '+name+' but room name is still present in user.rooms array');
      return callback(null, null); // null will be removed from room list in welcomeRemote
    },

    function prepare(room, callback) {
      if (room === null)
        return callback(null, null);

      var roomData = {
        name: room.name,
        owner: {},
        op: room.op, // [ObjectId]
        avatar: room._avatar(),
        poster: room._poster(),
        color: room.color,
        topic: room.topic
      };
      if (room.owner) {
        roomData.owner = {
          user_id: room.owner._id,
          username: room.owner.username
        };
      }

      return callback(null, roomData);
    }

  ], function(err, roomData) {
    if (err)
      return fn(err);

    return fn(null, roomData);
  });

};