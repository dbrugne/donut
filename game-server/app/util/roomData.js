var logger = require('../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Room = require('../../../shared/models/room');
var User = require('../../../shared/models/user');

/**
 * Helper to retrieve/prepare all the room data needed for 'welcome' and 'room:welcome' events:
 *   - room entity
 *   - owner
 *   - ops
 */
module.exports = function(app, uid, room, fn) {

  if (!room)
    return fn('Need to received a valid Room model as parameter');

  async.waterfall([

    function prepare(callback) {
      if (room === null)
        return callback(null, null);

      var roomData = {
        name      : room.name,
        id        : room.id,
        owner     : {},
        op        : room.op, // [ObjectId]
        devoices  : room.devoices, // [ObjectId]
        avatar    : room._avatar(),
        poster    : room._poster(),
        color     : room.color,
        topic     : room.topic
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