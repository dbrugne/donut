'use strict';
var express = require('express');
var router = express.Router();
var User = require('../../../shared/models/user');
var isLoggedIn = require('../middlewares/isloggedin');
var bouncer = require('../middlewares/bouncer');
var i18next = require('../../../shared/util/i18next');

var validateInput = function (req, res, next) {
  req.checkBody(['user', 'fields', 'username'], i18next.t('choose-username.usernameerror')).isUsername();
  if (req.validationErrors()) {
    return res.render('choose_username', {
      meta: {title: i18next.t('title.default')},
      userFields: req.body.user.fields,
      errors: req.validationErrors(),
      token: req.csrfToken()
    });
  }
  next();
};

var validateAvailability = function (req, res, next) {
  req.user.usernameAvailability(req.body.user.fields.username, function (err) {
    if (err) {
      if (err === 'not-available')
        err = i18next.t('choose-username.usernameexists');
      else
        err = 'Error while searching existing username: ' + err;

      return res.render('choose_username', {
        meta: {title: i18next.t('title.default')},
        userFields: req.body.user.fields,
        error: err,
        token: req.csrfToken()
      });
    }

    return next();
  });
};

var hasNotUsername = function (req, res, next) {
  if (req.user.username) {
    // Avoid username modification when user has already a username set
    console.log('This user has already a username: ' + req.user._id);
    return res.redirect('/!');
  }

  next();
};

router.route('/choose-username')
  .get([require('csurf')(), isLoggedIn, hasNotUsername], function (req, res) {
    res.render('choose_username', {
      meta: {title: i18next.t('title.default')},
      userFields: {},
      token: req.csrfToken()
    });
  })
  .post([require('csurf')(), isLoggedIn, hasNotUsername, validateInput, validateAvailability], function (req, res) {
    req.user.username = req.body.user.fields.username;
    req.user.save(function (err) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      } else {
        return bouncer.redirect(req, res);
      }
    });
  });

module.exports = router;
