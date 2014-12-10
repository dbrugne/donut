var expressValidator = require('express-validator');
var User = require('../models/user');
var Room = require('../models/room');

/**
 * Custom validators and sanitizers
 */

expressValidator.validator.extend('isUsername', function (str) {
  return User.validateUsername(str);
});

module.exports = expressValidator;