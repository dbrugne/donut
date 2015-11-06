'use strict';

var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var _online = require('../../../util/_online');
var _offline = require('../../../util/_offline');
var _ = require('underscore');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

var handler = Handler.prototype;

/**
 * New 'client' connection handler
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next stemp callback
 */
handler.enter = function (msg, session, next) {
  if (!session ||
    !session.__session__ ||
    !session.__session__.__socket__ ||
    !session.__session__.__socket__.socket ||
    !session.__session__.__socket__.socket.decoded_token) {
    return next('No user data provided by connector');
  }

  var uid = session.__session__.__socket__.socket.decoded_token.id;

  logger.trace('bind session ' + session.id + ' to user ' + uid);
  session.bind(uid);

  // disconnect event
  session.on('closed', _.bind(function () {
    _offline(this.app, session, null);
  }, this));

  _online(this.app, msg, uid, session, next);
};
