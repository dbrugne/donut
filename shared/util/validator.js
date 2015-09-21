'use strict';
var expressValidator = require('express-validator');
var common = require('@dbrugne/donut-common/server');

/**
 * Custom validators and sanitizers
 */

expressValidator.validator.extend('isUsername', function (str) {
  return common.validate.username(str);
});

module.exports = expressValidator;
