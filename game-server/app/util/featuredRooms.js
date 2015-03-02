var logger = require('../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var redis = require('../../../shared/io/redis');
var redisScan = require('redisscan');
var Room = require('../../../shared/models/room');

/**
 * Retrieve 'hot rooms' data to show on homepage and welcome popin:
 * - search in cache
 * - search for rooms in redis, determine number of users, take the top 10
 * - if not enough search in database for rooms with priority and fill the list until 10
 * - store in cache
 * - return
 */
var retriever = function(number, fn) {

  var number = number || 10;

  // available list in cache?
  // @todo : is in cache?

  // compute new list
  async.waterfall([

    function fromRedis(callback) {
      // pattern: pomelo:globalchannel:channel:#*}
      var rooms = {};
      redisScan({
        redis: redis,
        pattern: 'pomelo:globalchannel:channel:#*',
        each_callback: function (type, key, subkey, l, value, cb) {
          // init room array
          if (typeof rooms[key] == 'undefined')
            rooms[key] = [];

          // set a new uid for this room
          if (rooms[key].indexOf(value) === -1)
            rooms[key].push(value);

          cb();
        },
        done_callback: function (err) {
          var roomsCount = [];
          _.each(rooms, function(value, key, list) {
            var name = key.replace('pomelo:globalchannel:channel:', '').replace(/:connector-server-[0-9]+/, '');
            roomsCount.push({name: name, count: value.length});
          });
          roomsCount = _.sortBy(roomsCount, 'count')
              .reverse();
          roomsCount = _.map(roomsCount, function(value, index, list) {
            return value.name;
          });
          return callback(null, roomsCount);
        }
      });
    },

    function fromMongo(rooms, callback) {
      if (rooms.length >= number)
        return callback(rooms, callback);

      var left = number - rooms.length;

      var q = Room.find({ priority: {$exists: true, $gt: 0} }, 'name')
          .sort({priority: 'desc'})
          .limit(number*2) // lot of prioritized rooms could be already in Redis list
          .exec(function(err, result) {
            if (err)
              return callback('Error while searching rooms in Mongo: '+err);

            _.each(result, function(r) {
              if (rooms.indexOf(r.name) !== -1)
                return;

              rooms.push(r.name);
              if (rooms.length >= number)
                return false;
            });

            return callback(null, rooms);
          });
    },

    function hydrate(rooms, callback) {
      Room.find({ name: {$in: rooms} })
        .populate('owner', 'username')
        .exec(function(err, result) {
            if (err)
              return callback('Error while hydrating rooms from Mongo: '+err);

            return callback(null, result);
          });
    },

    function prepare(rooms, callback) {
      if (!rooms || !rooms.length)
        return callback(null, null);

      var roomsData = [];
      _.each(rooms, function(room) {
        var data = {
          name: room.name,
          owner: {},
          avatar: room._avatar(),
          poster: room._poster(),
          color: room.color,
          topic: room.topic
        };
        if (room.owner) {
          data.owner = {
            user_id: room.owner._id,
            username: room.owner.username
          };
        }
        roomsData.push(data);
      });

      // @todo : resort
      // @todo : add online users count

      return callback(null, roomsData);
    }

  ], function(err, roomsData) {
    if (err)
      return fn(err);

    return fn(null, roomsData);
  });

};

module.exports = retriever;