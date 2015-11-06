'use strict';
var logger = require('../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var keenio = require('../../../shared/io/keenio');

module.exports = function (app, session, reason) {
  if (!session || !session.uid) {
    return;
  } // could happen if a uid was not already bound before disconnect (crash,
    // bug, debug session, ...)

  var duration = Math.ceil((Date.now() - session.settings.started) / 1000); // seconds

  // Keen.io tracking
  var _socket = session.__session__.__socket__.socket;
  var sessionEvent = {
    session: {
      id: session.settings.uuid,
      connector: session.frontendId,
      device: _socket.handshake.query.device || 'unknown',
      ip: _socket.handshake.headers[ 'x-forwarded-for' ] || _socket.handshake.address,
      duration: duration
    },
    user: {
      id: session.uid,
      username: session.settings.username,
      admin: (session.settings.admin === true)
    }
  };
  keenio.addEvent('session_end', sessionEvent, function (err, res) {
    if (err) {
      logger.error('Error while tracking session_end in keen.io for ' + session.uid + ': ' + err);
    }

    // logger
    var log = {
      event: 'onUserLeave',
      frontendId: session.frontendId,
      time: new Date(),
      session_duration: duration
    };
    if (session.settings.username) {
      log.username = session.settings.username;
    }
    if (reason) {
      log.reason = reason;
    }
    logger.trace(log);

    // user:offline
    app.rpc.chat.statusRemote.socketGoesOffline(
      session,
      session.uid,
      function (err) {
        if (err) {
          logger.error('Error while statusRemote.socketGoesOffline: ' + err);
        }
      }
    );
  });
};