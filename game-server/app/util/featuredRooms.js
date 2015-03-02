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
var retriever = function(app, number, fn) {

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
          roomsCount = _.sortBy(roomsCount, 'count').reverse(); // desc
          roomsCount = _.first(roomsCount, number);
          return callback(null, roomsCount);
        }
      });
    },

    function fromMongo(rooms, callback) {
      if (rooms.length >= number)
        return callback(null, rooms);

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

              rooms.push({name: r.name, count: -1});
              if (rooms.length >= number)
                return false;
            });

            return callback(null, rooms);
          });
    },

    function hydrate(rooms, callback) {
      var names = _.map(rooms, function(r) {
        return r.name;
      });
      logger.warn('Found rooms: ', names);
      Room.find({ name: {$in: names} })
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
          name          : room.name,
          owner         : {},
          avatar        : room._avatar(),
          poster        : room._poster(),
          color         : room.color,
          description   : room.description,
          users         : 0
        };
        if (room.owner) {
          data.owner = {
            user_id: room.owner._id,
            username: room.owner.username
          };
        }
        roomsData.push(data);
      });

      return callback(null, roomsData);
    },

    function users(roomsData, callback) {
      var parallels = [];
      _.each(roomsData, function(room) {
        parallels.push(function(then) {
          app.globalChannelService.getMembersByChannelName('connector', room.name, function(err, members) {
            if (err)
              return then(err);

            return then(null, members.length);
          });
        });
      });
      async.parallel(parallels, function(err, result) {
        if (err)
          return callback('Error while retrieving room users length: '+err);

        _.each(roomsData, function(value, index) {
          roomsData[index].users = result[index];
        });

        return callback(null, roomsData);
      });
    },

    function sortList(roomsData, callback) {
      roomsData = _.sortBy(roomsData, 'users')
          .reverse(); // desc
      return callback(null, roomsData);
    }

  ], function(err, roomsData) {
    if (err)
      return fn(err);

    return fn(null, roomsData);
  });

};

module.exports = retriever;