var cookieParser = require('cookie-parser');
var passportSocketIo = require('passport.socketio');
var configuration = require('../config/app_dev');
var _ = require('underscore');
var delegate_authorization = require('./socket/authorization');
var delegate_connection = require('./socket/connection');
var delegate_disconnect = require('./socket/disconnect');
var delegate_room_join = require('./socket/room-join');
var delegate_room_leave = require('./socket/room-leave');
var delegate_room_topic = require('./socket/room-topic');
var delegate_room_message = require('./socket/room-message');
var delegate_room_search = require('./socket/room-search');
var delegate_room_profile = require('./socket/room-profile');
var delegate_user_message = require('./socket/room-message');
var delegate_user_search = require('./socket/user-search');
var delegate_user_profile = require('./socket/user-profile');


// @todo: test ACL for each operation => add todo comment everywhere
// @todo: add "activity" entry for each action
// @todo : other devices broadcast => add todo comment everywhere
// @todo : global escape input => add todo comment everywhere
// @todo : specific validation and sanitization for room name / user name => add todo comment everywhere
// broadcast : https://github.com/LearnBoost/socket.io/wiki/How-do-I-send-a-response-to-all-clients-except-sender%3F

module.exports = function(app, io, passport, sessionStore) {

  io.set('transports', [
      'websocket'
      , 'flashsocket'
  ]);

  io.set('log level', 3);

  // doc: https://www.npmjs.org/package/passport.socketio
  io.set('authorization', passportSocketIo.authorize({
      cookieParser: cookieParser,
      key:         configuration.sessions.key,
      secret:      configuration.sessions.secret,
      passport:    passport,
      store:       sessionStore,
      success:     delegate_authorization.success,
      fail:        delegate_authorization.fail
  }));

  io.sockets.on('connection', function (socket) {

    delegate_connection(io, socket);
    socket.on('disconnect', function() { delegate_disconnect(io, socket); });

    socket.on('room:join', function (data) { delegate_room_join(io, socket, data); });
    socket.on('room:leave', function (data) { delegate_room_leave(io, socket, data); });
    socket.on('room:topic', function (data) { delegate_room_topic(io, socket, data); });
    socket.on('room:message', function (data) { delegate_room_message(io, socket, data); });
    socket.on('room:search', function (data) { delegate_room_search(io, socket, data); });
    socket.on('room:profile', function (data) { delegate_room_profile(io, socket, data); });

    socket.on('user:message', function(data) { delegate_user_message(io, socket, data); });
    socket.on('user:search', function (data) { delegate_user_search(io, socket, data); });
    socket.on('user:profile', function (data) { delegate_user_profile(io, socket, data); });
    // @todo : onetoone open
    // @todo : onetoone close

  });
};
