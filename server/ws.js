var debug = require('debug')('chat-server');
var conf = require('./config/index');
var socketio = require('socket.io');
var socketioRedis = require('socket.io-redis');
var socketioPassport = require('passport.socketio');
var redisStore = require('./app/redissessions');
var cookieParser = require('cookie-parser');
var passport = require('./app/passport');

/**
 * Websocket server configuration and launching
 *
 * @param server
 */
module.exports = function(server) {

  /**
   * Socket.io server
   *
   * transports: [
   *   'websocket',
   *   'flashsocket',
   *   'htmlfile',
   *   'xhr-polling',
   *   'jsonp-polling',
   *   'polling'
   * ]
   */
  var io = socketio(server, {});

  // Redis storage
  io.adapter(socketioRedis({}));

  // Authentication
  io.use(socketioPassport.authorize({
    passport      : passport,
    cookieParser  : cookieParser,
    key           : conf.sessions.key,
    secret        : conf.sessions.secret,
    store         : redisStore,
    success       : require('./ws/authorization').success,
    fail          : require('./ws/authorization').fail
  }));

  io.on('connection', function (socket) {

    debug('new ws connection');

    require('./ws/connection')(io, socket);
    socket.on('disconnect', function() { require('./ws/disconnect')(io, socket); });

    socket.on('home', function() { require('./ws/home')(io, socket); });

    socket.on('search', function(data) { require('./ws/search')(io, socket, data); });

    socket.on('room:join', function (data) { require('./ws/room-join')(io, socket, data); });
    socket.on('room:leave', function (data) { require('./ws/room-leave')(io, socket, data); });
    socket.on('room:topic', function (data) { require('./ws/room-topic')(io, socket, data); });
    socket.on('room:message', function (data) { require('./ws/room-message')(io, socket, data); });
    socket.on('room:read', function (data) { require('./ws/room-read')(io, socket, data); });
    socket.on('room:update', function (data) { require('./ws/room-update')(io, socket, data); });
    socket.on('room:history', function (data) { require('./ws/room-history')(io, socket, data); });
    socket.on('room:op', function (data) { require('./ws/room-op')(io, socket, data); });
    socket.on('room:deop', function (data) { require('./ws/room-deop')(io, socket, data); });
    socket.on('room:kick', function (data) { require('./ws/room-kick')(io, socket, data); });

    socket.on('user:message', function(data) { require('./ws/user-message')(io, socket, data); });
    socket.on('user:profile', function (data) { require('./ws/user-profile')(io, socket, data); });
    socket.on('user:read', function (data) { require('./ws/user-read')(io, socket, data); });
    socket.on('user:update', function (data) { require('./ws/user-update')(io, socket, data); });
    socket.on('user:status', function (data) { require('./ws/user-status')(io, socket, data); });

  });

};