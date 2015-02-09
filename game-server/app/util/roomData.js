var logger = require('pomelo-logger').getLogger('pomelo', __filename);
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
module.exports = function(app, uid, name, opts, fn) {
  opts = _.extend({
  }, opts);

  async.waterfall([

    function findRoom(callback) {
      var q = Room.findByName(name)
        .populate('owner', 'username avatar color facebook')
        .populate('op', 'username avatar color facebook')
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

    function prepare(room, callback) {
      var roomData = {
        name: room.name,
        owner: {},
        op: [],
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
      if (room.op) {
        _.each(room.op, function(opUser) {
          roomData.op.push({
            user_id: opUser._id.toString(),
            username: opUser.username,
            avatar: opUser._avatar()
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