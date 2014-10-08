var _ = require('underscore');
var async = require('async');
var debug = require('debug')('chat-server');
var User = require('../app/models/user');
var Room = require('../app/models/room');
var Activity = require('../app/models/activity');
var redis = require('../app/redis');

/**
 * Helper methods to persist and retrieve socket/room/user data in Redis/MongoDB
 * Helpers are available on each socket: socket.helper.foo()
 *
 * Use the alias-variable 'socket' to get current socket Object
 */
module.exports = function (io, socket) {
  return {

    _: _,

    /**
     * Throw on socket connection
     * @param fn
     */
    registerSocket: function(fn) {
      async.parallel([

        function registerSocketInRedis(callback) {
          var multi = redis.multi()
            .sadd('donut:sockets', socket.id)
//            .sadd('donut:users', socket.getUserId()) => not needed
            .sadd('donut:user:'+socket.getUserId(), socket.id)
            .exec(function(err, results) {
            if (err)
              return callback('Error while registering node in donut:sockets and donut:users: '+err);
            else
              return callback();
          });
        },
        function registerSocketInUserRoom(callback) {
          socket.join('user:'+socket.getUserId(), function() {
            return callback(null);
          });
        },
        function updateLastLoginDate(callback) {
          var user = socket.getUser();
          user.lastlogin_at = Date.now();
          user.save(function(err) {
            if (err)
              return callback('Unable to update user lastlogin_at: '+err);
            else
              return callback();
          });
        }

      ], function(err, results) {
        if (err)
          return fn(err);

        console.log('socket '+socket.id+' registered, now online!');
        return fn();
      });
    },
    unregisterSocket: function(fn) {
      async.parallel([

        function registerSocketInRedis(callback) {
          var multi = redis.multi()
            .srem('donut:sockets', socket.id)
            .srem('donut:user:'+socket.getUserId(), socket.id)
//            .smembers('donut:user:'+socket.getUserId())
            .exec(function(err, results) {
              if (err)
                return callback('Error while unregistering socket from donut:sockets and donut:user:'+socket.getUserId()+': '+err);

//              if (results[2].length < 1) // no more socket for this user
//                redis.srem('donut:users', socket.getUserId(), function(err) {
//                  return callback('Error while unregistering socket in donut:users: '+err);
//                });
//              else
                return callback();
            });
        },
        function unregisterSocketFromUserRoom(callback) {
          socket.leave('user:'+socket.getUserId(), function() {
            return callback(null);
          });
        }

      ], function(err, results) {
        if (err)
          return fn(err);

        console.log('socket '+socket.id+' registered, now online!');
        return fn();
      });

    },

    isUserOnline: function(userId, fn) {
      redis.sismember('donut:users', userId, function(err, is) {
        if (err)
          console.log('Error while sismember on donut:users: '+err);

        var bool = (is == 1) ? true : false;
        return fn(bool);
      });
    }

  };
};