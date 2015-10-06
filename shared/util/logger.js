'use strict';
/**
 * @todo : remove direct require() of this file in ws-server/ will be possible
 *         once the interns are on node 4.0 and NPM 3.3 with flat node_modules
 *         structure
 *
 *         Then shared/ modules will be the only ones to use this file
 */

var exports = module.exports = require('pomelo-logger');
exports.configure(require('../../ws-server/config/log4js'));
