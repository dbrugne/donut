'use strict';
var express = require('express');
var router = express.Router();
var passport = require('../../../shared/authentication/passport');
var i18next = require('../../../shared/util/i18next');
var bouncer = require('../middlewares/bouncer');
var User = require('../../../shared/models/user');

var validateInput = function (req, res, next) {
  req.checkBody('email', i18next.t('account.email.error.format')).isEmail();
  req.checkBody('password', i18next.t('account.password.error.length')).isLength(6, 50);
  req.checkBody('username', i18next.t('choose-username.usernameerror')).isUsername();
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

var validateAvailability = function (req, res, next) {
  User.usernameAvailability(req.body.username, function (err) {
    if (!err) {
      return next();
    }

    var errorMessage = (err === 'not-available') ?
      i18next.t('choose-username.usernameexists') :
      errorMessage = i18next.t('global.unknownerror');

    return res.render('signup', {
      meta: { title: i18next.t('title.default') },
      userFields: {
        email: req.body.email,
        username: req.body.username
      },
      errors: [
        { param: 'username', msg: errorMessage, value: req.body.username }
      ],
      token: req.csrfToken()
    });
  });
};

router.route('/signup')
  .get([require('csurf')()], function (req, res) {
    var logged = req.isAuthenticated();
    res.render('signup', {
      meta: {title: i18next.t('title.default')},
      logged: logged,
      userFields: {},
      token: req.csrfToken()
    });
  })
  .post([require('csurf')(), validateInput, validateAvailability, passport.authenticate('local-signup', {
    failureRedirect: '/signup',
    failureFlash: true
  })], bouncer.redirect);

module.exports = router;
