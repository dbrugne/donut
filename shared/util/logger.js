'use strict';
/**
 * This class is a wrapper for the f#*$%! pomelo-logger module.
 *
 * The module is configured by Pomelo application ONLY in this place:
 * ./ws-server/node_modules/pomelo/node_modules/pomelo-logger
 */
var configuredPomeloLogger = require('../../node_modules/pomelo/node_modules/pomelo-logger/index');

module.exports = configuredPomeloLogger;
