'use strict';

var passport = require('../../../shared/authentication/passport');

module.exports = function AuthorizationMiddleware (req, res, next) {
  // @todo : can handle req.body.token as alternative authentication to
  return passport.authenticate('jwt', {session: false})(req, res, next);
};
