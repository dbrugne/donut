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
  io.adapter(socketioRedis());

  // Authentication
  io.use(socketioPassport.authorize({
    passport      : passport,
    cookieParser  : cookieParser,
    key           : conf.sessions.key,
    secret        : conf.sessions.secret,
    store         : redisStore,
    success       : require('./app/socket/authorization').success,
    fail          : require('./app/socket/authorization').fail
  }));

  io.on('connection', function (socket) {

    require('./app/socket/connection')(io, socket);
    socket.on('disconnect', function() { require('./app/socket/disconnect')(io, socket); });

    socket.on('home', function() { require('./app/socket/home')(io, socket); });

    socket.on('room:join', function (data) { require('./app/socket/room-join')(io, socket, data); });
    socket.on('room:leave', function (data) { require('./app/socket/room-leave')(io, socket, data); });
    socket.on('room:topic', function (data) { require('./app/app/socket/room-topic')(io, socket, data); });
    socket.on('room:message', function (data) { require('./app/socket/room-message')(io, socket, data); });
    socket.on('room:search', function (data) { require('./app/socket/room-search')(io, socket, data); });
    socket.on('room:profile', function (data) { require('./app/socket/room-profile')(io, socket, data); });
    socket.on('room:permanent', function (data) { require('./app/socket/room-permanent')(io, socket, data); });
    socket.on('room:history', function (data) { require('./app/socket/room-history')(io, socket, data); });

    socket.on('user:open', function(data) { require('./app/socket/user-open')(io, socket, data); });
    socket.on('user:close', function(data) { require('./app/socket/user-close')(io, socket, data); });
    socket.on('user:message', function(data) { require('./app/socket/user-message')(io, socket, data); });
    socket.on('user:search', function (data) { require('./app/socket/user-search')(io, socket, data); });
    socket.on('user:profile', function (data) { require('./app/socket/user-profile')(io, socket, data); });
    socket.on('user:status', function (data) { require('./app/socket/user-status')(io, socket, data); });

  });

};