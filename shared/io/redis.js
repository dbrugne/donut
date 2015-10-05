'use strict';
var logger = require('../util/logger').getLogger('donut', __filename);
var redis = require('redis');

redis.debug_mode = false; // @debug

// redis client used by express-session, passport and featuredRooms only, could
// maybe be removed
var client = redis.createClient(null, null, {});
module.exports = client;

client.on('connect', function () {
  logger.debug('Connection to Redis established (connect)');
});

client.on('ready', function () {
  if (redis.debug_mode) {
    logger.debug('Connection to Redis established (ready)');
  }
});

client.on('end', function () {
  logger.debug('Connection to Redis closed (end)');
});

client.on('drain', function () {
  if (redis.debug_mode) {
    logger.debug('Connection to Redis (drain)');
  }
});

client.on('idle', function () {
  if (redis.debug_mode) {
    logger.debug('Connection to Redis (idle)');
  }
});

client.on('error', function (err) {
  logger.error('Redis: error ' + err);
});
