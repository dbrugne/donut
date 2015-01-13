var debug = require('debug')('donut:debug-middleware');
var conf = require('../../../shared/config/index');

module.exports = function(req, res, next) {
  // is enabled?
  if (conf.debug === undefined || conf.debug.cookie === undefined) {
    debug('debug-middleware: no cookie key set in configuration');
    return next();
  }

  if (!req.cookies || !req.cookies[conf.debug.cookie]) {
    req._debug = false;
  } else {
    req._debug = true;
  }
  req.isDebug = function() {
    return !!this._debug;
  };

  return next();
};