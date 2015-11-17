'use strict';
var logger = require('../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var async = require('async');
var _ = require('underscore');
var Notifications = require('../components/notifications/index');
var uuid = require('node-uuid');
var keenio = require('../../../shared/io/keenio');

var GLOBAL_CHANNEL_NAME = 'global';
var USER_CHANNEL_PREFIX = 'user:';

module.exports = function (app, msg, session, next) {
  var uid = session.__session__.__socket__.socket.decoded_token.id;
  var device = session.__session__.__socket__.socket.handshake.query.device;

  logger.trace('entry request for ' + uid + '@' + session.frontendId + ' sessionId: ' + session.id);

  // bind uid to pomelo sessions
  session.bind(uid);

  var firstClient = true;

  async.waterfall([

    function determineIfFirstClient (callback) {
      // another session already exists on this frontend for this uid?
      var currentUidSessions = app.get('sessionService').getByUid(uid);
      if (currentUidSessions && currentUidSessions.length > 1) {
        logger.trace('at least another session exists for this user on this frontend: [%s] [%s] (firstClient=false)', session.uid, session.frontendId);
        firstClient = false;
        return callback(null);
      }

      // search for session on other frontends
      app.statusService.getSidsByUid(uid, function (err, sids) {
        if (err) {
          return callback('Error while retrieving user status: ' + err);
        }

        if (sids && sids.length > 0) {
          _.each(sids, function (sid) {
            if (sid !== session.frontendId) {
              firstClient = false;
            }
          });
        }

        return callback(null);
      });
    },

    function welcomeMessage (callback) {
      if (!app.rpc || !app.rpc.chat) {
        return callback('app.rpc.chat not already exists, server is not ready');
      }

      // delegate connect logic to 'chat' server and get welcome message in
      // return
      return app.rpc.chat.welcomeRemote.getMessage(
        session,
        uid,
        session.frontendId,
        {device: device},
        callback
      );
    },

    function declareIdentity (welcome, callback) {
      // add username in connection monitoring
      app.components.__connection__.updateUserInfo(uid, {
        username: welcome.user.username,
        remote: session.__session__.__socket__.socket.handshake.address,
        server: session.__session__.__socket__.socket.handshake.headers.host
      });

      // add session unique ID (tracking)
      session.set('uuid', uuid.v1());
      session.set('device', device);

      // add username, avatar, color and admin flag on session
      session.set('username', welcome.user.username);
      session.set('avatar', welcome.user.avatar);
      session.set('color', welcome.user.color);
      session.set('started', Date.now());
      if (welcome.user.admin === true) {
        session.set('admin', true);
      }

      session.pushAll(function (err) {
        if (err) {
          return callback('Error while updating session infos: ' + err);
        }
        return callback(null, welcome);
      });
    },

    function subscribeRoomChannels (welcome, callback) {
      if (!welcome.rooms || welcome.rooms.length < 1) {
        return callback(null, welcome);
      }

      var parallels = [];
      _.each(welcome.rooms, function (room) {
        parallels.push(function (fn) {
          app.globalChannelService.add(room.room_id, uid, session.frontendId, function (err) {
            if (err) {
              return fn('Error while registering user in room channel: ' + err);
            }

            return fn(null, room.name);
          });
        });
      });
      async.parallel(parallels, function (err, results) {
        if (err) {
          return callback('Error while registering user in rooms channels: ' + err);
        }

        return callback(null, welcome);
      });
    },

    function subscribeUserChannel (welcome, callback) {
      app.globalChannelService.add(USER_CHANNEL_PREFIX + uid, uid, session.frontendId, function (err) {
        if (err) {
          return callback('Error while registering user in user channel: ' + err);
        }

        return callback(null, welcome);
      });
    },

    function subscribeGlobalChannel (welcome, callback) {
      app.globalChannelService.add(GLOBAL_CHANNEL_NAME, uid, session.frontendId, function (err) {
        if (err) {
          return callback('Error while registering user in global channel: ' + err);
        }

        return callback(null, welcome);
      });
    },

    function cleanupNotifications (welcome, callback) {
      Notifications(app).avoidNotificationsSending(uid, function (err) {
        if (err) {
          return callback('Error while setting notifications as read for ' + session.uid + ': ' + err);
        }

        return callback(null, welcome);
      });
    },

    function tracking (welcome, callback) {
      var _socket = session.__session__.__socket__.socket;
      var sessionEvent = {
        session: {
          id: session.settings.uuid,
          connector: session.frontendId,
          device: _socket.handshake.query.device || 'unknown',
          ip: _socket.handshake.headers[ 'x-forwarded-for' ] || _socket.handshake.address
        },
        user: {
          id: uid,
          username: session.settings.username,
          admin: (session.settings.admin === true)
        }
      };
      keenio.addEvent('session_start', sessionEvent, function (err, res) {
        if (err) {
          logger.error('Error while tracking session_start in keen.io for ' + uid + ': ' + err);
        }

        return callback(null, welcome);
      });
    },

    function sendUserOnline (welcome, callback) {
      if (!firstClient) {
        return callback(null, welcome);
      }

      app.rpc.chat.statusRemote.online(
        session,
        uid,
        welcome,
        function (err) {
          if (err) {
            logger.error('Error while statusRemote.online', err);
          }
        }
      );

      // don't wait for response before continuing
      return callback(null, welcome);
    }

  ], function (err, welcome) {
    if (err) {
      logger.error(err);
      return next(null, { code: 500, error: true, msg: err });
    }

    return next(null, welcome);
  });
};
