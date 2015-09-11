'use strict';
/**
 * Record connector->chat requests with time used for each request.
 */
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);

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
      route: msg.__route__,
      frontendId: session.frontendId,
      args: msg,
      time: new Date(start),
      timeUsed: timeUsed
    };
    if (resp && resp.id) {
      log.id = resp.id;
    }
    if (session.settings.username) {
      log.username = session.settings.username;
    }

    logger.info(JSON.stringify(log)); // need to stringify, otherwise
                                      // pomelo-logger will transform in
                                      // [object Object],
    // will be parse to object by log4js-node-mongodb
  }
  next(err);
};
