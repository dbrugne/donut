'use strict';
var debug = require('debug')('shared:redis');
var redis = require('redis');

redis.debug_mode = false; // @debug

var client = redis.createClient(null, null, {}); // redis client used by express-session, passport and featuredRooms only
// , could maybe be removed
module.exports = client;

client.on('connect', function () {
  debug('Connection to Redis established (connect)');
});

client.on('ready', function () {
  if (redis.debug_mode) debug('Connection to Redis established (ready)');
});

client.on('end', function () {
  debug('Connection to Redis closed (end)');
});

client.on('drain', function () {
  if (redis.debug_mode) debug('Connection to Redis (drain)');
});

client.on('idle', function () {
  if (redis.debug_mode) debug('Connection to Redis (idle)');
});

client.on('error', function (err) {
  debug('Redis: error ' + err);
});
