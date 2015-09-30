'use strict';
var logger = require('./logger').getLogger('featured', __filename);
var async = require('async');
var _ = require('underscore');
var redis = require('../io/redis');
var redisScan = require('redisscan');
var Room = require('../models/room');

/**
 * Retrieve 'hot rooms' data to show on homepage and welcome popin:
 * - search in cache
 * - search for rooms in redis, determine number of users, take the top 10
 * - if not enough search in database for rooms with priority and fill the list
 * until 10
 * - store in cache
 * - return
 */

var CACHE_KEY = 'donut:featured';

var CACHE_TTL = 90; // seconds

var CACHE_NUMBER = 10;

var retriever = function (app, fn) {
  // available list in cache?
  redis.get(CACHE_KEY, function (err, result) {
    if (err) {
      logger.error('Error while retrieving cache: ' + err);
    }

    try {
      var roomsData = JSON.parse(result);
      if (_.isArray(roomsData) && roomsData.length > 0) {
        logger.debug('Get featured from cache');
        return fn(null, roomsData);
      } else {
        retrieve();
      }
    } catch (e) {
      logger.error('Error while parsing cache: ', e);
      retrieve();
    }
  });

  function retrieve () {
    // compute new list
    async.waterfall([

      function fromRedis (callback) {
        // pattern: pomelo:globalchannel:channel:#*}
        var rooms = {};
        redisScan({
          redis: redis,
          pattern: 'pomelo:globalchannel:channel:#*',
          each_callback: function (type, key, subkey, l, value, cb) {
            // init room array
            if (typeof rooms[key] === 'undefined') {
              rooms[key] = [];
            }

            // set a new uid for this room
            if (rooms[key].indexOf(value) === -1) {
              rooms[key].push(value);
            }

            cb();
          },
          done_callback: function (err) {
            if (err) {
              return callback(err);
            }
            var roomsCount = [];
            _.each(rooms, function (value, key, list) {
              var name = key.replace('pomelo:globalchannel:channel:', '').replace(/:connector-server-[0-9]+/, '');
              roomsCount.push({name: name, count: value.length});
            });
            roomsCount = _.sortBy(roomsCount, 'count').reverse(); // desc
            return callback(null, roomsCount);
          }
        });
      },

      function fromMongo (rooms, callback) {
        if (rooms.length >= CACHE_NUMBER) {
          return callback(null, rooms);
        }

        Room.find({
          priority: {$exists: true, $gt: 0},
          visibility: true,
          deleted: {$ne: true}
        }, 'name')
          .sort({priority: 'desc'})
          .limit(CACHE_NUMBER * 2) // lot of prioritized rooms could be already
                                   // in Redis list
          .exec(function (err, result) {
            if (err) {
              return callback('Error while searching rooms in Mongo: ' + err);
            }

            _.each(result, function (r) {
              if (rooms.indexOf(r.name) !== -1) {
                return;
              }

              rooms.push({name: r.name, count: -1});
              if (rooms.length >= CACHE_NUMBER) {
                return false;
              }
            });

            return callback(null, rooms);
          });
      },

      function hydrate (rooms, callback) {
        var names = _.map(rooms, function (r) {
          return r.name;
        });

        Room.find({name: {$in: names}})
          .populate('owner', 'username')
          .populate('group', 'name')
          .exec(function (err, result) {
            if (err) {
              return callback('Error while hydrating rooms from Mongo: ' + err);
            }

            return callback(null, result);
          });
      },

      function prepare (rooms, callback) {
        if (!rooms || !rooms.length) {
          return callback(null, null);
        }

        var roomsData = [];
        _.each(rooms, function (room) {
          if (room.visibility !== true) {
            return;
          }

          var data = {
            name: room.name,
            room_id: room.id,
            avatar: room._avatar(),
            poster: room._poster(),
            color: room.color,
            description: room.description,
            users: (room.users) ? room.users.length : 0,
            onlines: 0,
            mode: room.mode
          };
          if (room.group) {
            data.group_id = room.group.id;
            data.group_name = room.group.name;
          }
          if (room.owner) {
            data.owner_id = room.owner.id;
            data.owner_username = room.owner.username;
          }
          roomsData.push(data);
        });

        return callback(null, roomsData);
      },

      function onlines (roomsData, callback) {
        if (!app) {
          // skip ws platform requesting if app is null (happen when called from express)
          return callback(null, roomsData);
        }
        var parallels = [];
        _.each(roomsData, function (room) {
          parallels.push(function (then) {
            app.globalChannelService.getMembersByChannelName('connector', room.name, function (err, members) {
              if (err) {
                return then(err);
              }

              return then(null, members.length);
            });
          });
        });
        async.parallel(parallels, function (err, result) {
          if (err) {
            return callback('Error while retrieving room online users length: ' + err);
          }

          _.each(roomsData, function (value, index) {
            roomsData[index].onlines = result[index];
          });

          return callback(null, roomsData);
        });
      },

      function sortList (roomsData, callback) {
        roomsData = _.sortBy(roomsData, 'onlines')
          .reverse(); // desc
        return callback(null, roomsData);
      },

      function storeInCache (roomsData, callback) {
        var multi = redis.multi();
        multi.set(CACHE_KEY, JSON.stringify(roomsData));
        multi.expire(CACHE_KEY, CACHE_TTL);
        multi.exec(function (err) {
          if (err) {
            logger.error('Error while storing featured in cache: ' + err);
          }

          logger.debug('Stored featured in cache');
          return callback(null, roomsData);
        });
      }

    ], function (err, roomsData) {
      if (err) {
        return fn(err);
      }

      return fn(null, roomsData);
    });
  }
};

module.exports = retriever;
