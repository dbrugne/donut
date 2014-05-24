var cookieParser = require('cookie-parser');
var passportSocketIo = require('passport.socketio');
var conf = require('../config/index');
var _ = require('underscore');
var delegate_authorization = require('./socket/authorization');
var delegate_connection = require('./socket/connection');
var delegate_disconnect = require('./socket/disconnect');
var delegate_home = require('./socket/home');
var delegate_room_join = require('./socket/room-join');
var delegate_room_leave = require('./socket/room-leave');
var delegate_room_topic = require('./socket/room-topic');
var delegate_room_message = require('./socket/room-message');
var delegate_room_search = require('./socket/room-search');
var delegate_room_profile = require('./socket/room-profile');
var delegate_user_message = require('./socket/user-message');
var delegate_user_search = require('./socket/user-search');
var delegate_user_profile = require('./socket/user-profile');
var delegate_user_open = require('./socket/user-open');
var delegate_user_close = require('./socket/user-close');

// @todo : pass on each socket delegation and:
//         - identify input test to process (and report method in models)
//         - identify sanitization to process
//         - identify broadcast to other device to do
//         - ACL to implement

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

    delegate_connection(io, socket);
    socket.on('disconnect', function() { delegate_disconnect(io, socket); });

    socket.on('home', function() { delegate_home(io, socket); });

    socket.on('room:join', function (data) { delegate_room_join(io, socket, data); });
    socket.on('room:leave', function (data) { delegate_room_leave(io, socket, data); });
    socket.on('room:topic', function (data) { delegate_room_topic(io, socket, data); });
    socket.on('room:message', function (data) { delegate_room_message(io, socket, data); });
    socket.on('room:search', function (data) { delegate_room_search(io, socket, data); });
    socket.on('room:profile', function (data) { delegate_room_profile(io, socket, data); });

    socket.on('user:open', function(data) { delegate_user_open(io, socket, data); });
    socket.on('user:close', function(data) { delegate_user_close(io, socket, data); });
    socket.on('user:message', function(data) { delegate_user_message(io, socket, data); });
    socket.on('user:search', function (data) { delegate_user_search(io, socket, data); });
    socket.on('user:profile', function (data) { delegate_user_profile(io, socket, data); });

  });
};
