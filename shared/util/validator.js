'use strict';
var expressValidator = require('express-validator');
var User = require('../models/user');
var common = require('@dbrugne/donut-common');

/**
 * Custom validators and sanitizers
 */

expressValidator.validator.extend('isUsername', function (str) {
  return common.validateUsername(str);
});

module.exports = expressValidator;
