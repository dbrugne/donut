'use strict';
var express = require('express');
var router = express.Router();
var passport = require('../../../shared/authentication/passport');
var i18next = require('../../../shared/util/i18next');
var bouncer = require('../middlewares/bouncer');

var validateInput = function (req, res, next) {
  req.checkBody('email', i18next.t('account.email.error.format')).isEmail();
  req.checkBody('email', i18next.t('account.email.error.domain')).isEmailDomainAllowed();
  req.checkBody('password', i18next.t('account.password.error.length')).isLength(4, 255);
  if (req.validationErrors()) {
    return res.render('signup', {
      meta: {title: i18next.t('title.default')},
      userFields: {
        email: req.body.email,
        username: req.body.username
      },
      errors: req.validationErrors(),
      token: req.csrfToken()
    });
  }

  return next();
};

router.route('/signup')
  .get([require('csurf')()], function (req, res) {
    res.render('signup', {
      meta: {title: i18next.t('title.default')},
      userFields: {},
      token: req.csrfToken()
    });
  })
  .post([require('csurf')(), validateInput, function (req, res, next) {
    passport.authenticate('local-signup', function (err, user, info) {
      if (err) {
        var errorMessage;
        switch (err) {
          case 'email-alreadyexists' :
            errorMessage = i18next.t('account.email.error.alreadyexists');
            break;
          case 'usernameerror':
            errorMessage = i18next.t('choose-username.usernameerror');
            break;
          case 'not-available':
            errorMessage = i18next.t('choose-username.usernameexists');
            break;
          default :
            errorMessage = i18next.t('global.unknownerror');
        }
        return res.render('signup', {
          meta: {title: i18next.t('title.default')},
          userFields: {
            email: req.body.email,
            username: req.body.username
          },
          errors: [{msg: errorMessage}],
          token: req.csrfToken()
        });
      }
      req.logIn(user, function (err) {
        if (err) { return next(err); }
        return bouncer.redirect(req, res);
      });
    })(req, res, next);
  }], bouncer.redirect);

module.exports = router;
