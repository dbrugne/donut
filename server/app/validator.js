var expressValidator = require('express-validator');

/**
 * Custom validators and sanitizers
 */

expressValidator.validator.extend('toLowerCase', function (str) {
    return str.toLowerCase();
});

module.exports = expressValidator;