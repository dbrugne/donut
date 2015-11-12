'use strict';
var expressValidator = require('express-validator');
var common = require('@dbrugne/donut-common/server');
var disposableDomains = require('disposable-email-domains');

/**
 * Custom validators and sanitizers
 */

expressValidator.validator.extend('isUsername', function (str) {
  return common.validate.username(str);
});

expressValidator.validator.extend('isEmailDomainAllowed', function (str) {
  var domain = str.split('@')[1];
  return (disposableDomains.indexOf(domain) === -1);
});

module.exports = expressValidator;
