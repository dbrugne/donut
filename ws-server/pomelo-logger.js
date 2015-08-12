/**
 * This class is a wrapper for the f#*$%! pomelo-logger module.
 *
 * The module is configured by Pomelo application ONLY in this place: ./ws-server/node_modules/pomelo/node_modules/pomelo-logger
 */
var configuredPomeloLogger = require('../node_modules/pomelo/node_modules/pomelo-logger');

///**
// * VERY UGLY @HACK
// *
// * Method duplicated from: ./node_modules/pomelo-logger/lib/logger.js:11
// * Comment the systematic transtyping to string
// *
// * @param categoryName
// * @returns {{}}
// */
//var log4js = require('./node_modules/pomelo/node_modules/pomelo-logger/node_modules/log4js');
//configuredPomeloLogger.getLogger = function (categoryName) {
//  var args = arguments;
//  var prefix = "";
//  for (var i = 1; i < args.length; i++) {
//    if (i !== args.length - 1)
//      prefix = prefix + args[i] + "] [";
//    else
//      prefix = prefix + args[i];
//  }
//  if (typeof categoryName === 'string') {
//    // category name is __filename then cut the prefix path
//    categoryName = categoryName.replace(process.cwd(), '');
//  }
//  var logger = log4js.getLogger(categoryName);
//  var pLogger = {};
//  for (var key in logger) {
//    pLogger[key] = logger[key];
//  }
//
//  ['log', 'debug', 'info', 'warn', 'error', 'trace', 'fatal'].forEach(function(item) {
//    pLogger[item] = function() {
//      var p = "";
//      if (!process.env.RAW_MESSAGE) {
//        if (args.length > 1) {
//          p = "[" + prefix + "] ";
//        }
//        if (args.length && process.env.LOGGER_LINE) {
//          p = getLine() + ": " + p;
//        }
//        p = colorize(p, colours[item]);
//      }
//
//      if (args.length) {
//        arguments[0] = p + arguments[0];
//      }
//      logger[item].apply(logger, arguments);
//    }
//  });
//  return pLogger;
//};

module.exports = configuredPomeloLogger;