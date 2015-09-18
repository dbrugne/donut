'use strict';
/**
 * Log connector/chat requests with time used for each request.
 */
var logger = require('../../../shared/util/logger').getLogger('donut');
var _ = require('underscore');

module.exports = function () {
  return new Filter();
};

var Filter = function () {
};

Filter.prototype.before = function (msg, session, next) {
  session.__startTime__ = Date.now();
  next();
};

Filter.prototype.after = function (err, msg, session, resp, next) {
  var start = session.__startTime__;
  if (typeof start === 'number') {
    var timeUsed = Date.now() - start;
    var log = {
      data: _.omit(msg, '__route__'),
      duration: timeUsed
    };
    if (session.settings.username) {
      log.username = session.settings.username;
    }

    logger.debug(msg.__route__, session.frontendId, log);
  }
  next(err);
};
