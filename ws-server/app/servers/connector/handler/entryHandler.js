'use strict';

var _ = require('underscore');
var online = require('../../../util/_online');
var offline = require('../../../util/_offline');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.offline = _.bind(offline, this);
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
    return next('no-user-data-provided-by-connector');
  }

  // socket go offline
  session.on('closed', this.offline);

  // socket go online
  online(this.app, msg, session, next);
};
