var cookieParser = require('cookie-parser');
var passportSocketIo = require('passport.socketio');
var conf = require('../config/index');
var _ = require('underscore');
var delegate_authorization = require('./socket/authorization');

/**
 * Send/broadcast help page https://github.com/LearnBoost/socket.io/wiki/How-do-I-send-a-response-to-all-clients-except-sender%3F
 *
 * @param app
 * @param io
 * @param passport
 * @param sessionStore
 */

module.exports = function(app, io, passport, sessionStore) {

  io.set('transports', [
      'websocket'
      , 'flashsocket'
  ]);

  io.set('log level', 3);

  // doc: https://www.npmjs.org/package/passport.socketio
  io.set('authorization', passportSocketIo.authorize({
      cookieParser: cookieParser,
      key:         conf.sessions.key,
      secret:      conf.sessions.secret,
      passport:    passport,
      store:       sessionStore,
      success:     delegate_authorization.success,
      fail:        delegate_authorization.fail
  }));

  io.sockets.on('connection', function (socket) {

    require('./socket/connection')(io, socket);
    socket.on('disconnect', function() { require('./socket/disconnect')(io, socket); });

    socket.on('home', function() { require('./socket/home')(io, socket); });

    socket.on('room:join', function (data) { require('./socket/room-join')(io, socket, data); });
    socket.on('room:leave', function (data) { require('./socket/room-leave')(io, socket, data); });
    socket.on('room:topic', function (data) { require('./socket/room-topic')(io, socket, data); });
    socket.on('room:message', function (data) { require('./socket/room-message')(io, socket, data); });
    socket.on('room:search', function (data) { require('./socket/room-search')(io, socket, data); });
    socket.on('room:profile', function (data) { require('./socket/room-profile')(io, socket, data); });
    socket.on('room:permanent', function (data) { require('./socket/room-permanent')(io, socket, data); });
    socket.on('room:history', function (data) { require('./socket/room-history')(io, socket, data); });

    socket.on('user:open', function(data) { require('./socket/user-open')(io, socket, data); });
    socket.on('user:close', function(data) { require('./socket/user-close')(io, socket, data); });
    socket.on('user:message', function(data) { require('./socket/user-message')(io, socket, data); });
    socket.on('user:search', function (data) { require('./socket/user-search')(io, socket, data); });
    socket.on('user:profile', function (data) { require('./socket/user-profile')(io, socket, data); });
    socket.on('user:status', function (data) { require('./socket/user-status')(io, socket, data); });

  });
};
