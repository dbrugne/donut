'use strict';
var express = require('express');
var router = express.Router();
var emailer = require('../../../shared/io/emailer');
var async = require('async');
var crypto = require('crypto');
var User = require('../../../shared/models/user');
var i18next = require('../../../shared/util/i18next');
var logger = require('../../../shared/util/logger').getLogger('web', __filename);

// @doc: http://sahatyalkabov.com/how-to-implement-password-reset-in-nodejs/

var validateInput = function (req, res, next) {
  req.checkBody(['email'], i18next.t('account.email.format')).isEmail();
  if (req.validationErrors()) {
    return res.render('account_forgot', {
      meta: {title: i18next.t('title.default')},
      email: req.body.email,
      errors: req.validationErrors(),
      token: req.csrfToken()
    });
  }
  next();
};

var forgot = function (req, res) {
  async.waterfall([
    function (done) {
      crypto.randomBytes(20, function (err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function (token, done) {
      User.findOne({'local.email': req.body.email}, function (err, user) {
        if (err) {
          req.flash('error', i18next.t('global.unknownerror'));
          return res.redirect('/forgot');
        }
        if (!user) {
          req.flash('error', i18next.t('forgot.error.notexists'));
          return res.redirect('/forgot');
        }

        user.local.resetToken = token;
        user.local.resetExpires = Date.now() + 3600000; // 1 hour

        user.save(function (err) {
          done(err, token, user);
        });
      });
    },
    function (token, user, done) {
      emailer.forgot(user.local.email, token, function (err) {
        if (err) {
          return done('Unable to sent forgot email: ' + err);
        }

        req.flash('info', i18next.t('forgot.sent', {email: user.local.email}));
        return done(err);
      });
    }
  ], function (err) {
    if (err) {
      console.log(err);
    }

    res.redirect('/forgot');
  });
};

var reset = function (req, res) {
  if (!req.body.password || !req.body.confirm || req.body.password !== req.body.confirm) {
    req.flash('error', i18next.t('account.password.error.confirm'));
    return res.redirect('back');
  }

  async.waterfall([
    function (done) {
      User.findOne({
        'local.resetToken': req.params.token,
        'local.resetExpires': {$gt: Date.now()}
      }, function (err, user) {
        if (err) {
          return done(err);
        }
        if (!user) {
          req.flash('error', i18next.t('forgot.error.expired'));
          return res.redirect('back');
        }

        user.local.password = user.generateHash(req.body.password);
        user.local.resetToken = undefined;
        user.local.resetExpires = undefined;

        user.save(function (err) {
          if (err) {
            return done(err);
          }
          req.logIn(user, function (err) {
            done(err, user);
          });
        });
      });
    },
    function (user, done) {
      emailer.passwordChanged(user.local.email, function (err) {
        if (err) {
          return done('Unable to sent password changed (forgot) email: ' + err);
        }

        req.flash('success', i18next.t('forgot.success'));
        return done(err);
      });
    }
  ], function (err) {
    if (err) {
      logger.debug(err);
    }
    res.redirect('/');
  });
};

router.route('/forgot')
  .get(require('csurf')(), function (req, res) {
    res.render('account_forgot', {
      email: '',
      meta: {title: i18next.t('title.default')},
      token: req.csrfToken()
    });
  })
  .post(require('csurf')(), validateInput, forgot);

router.route('/reset/:token')
  .get(require('csurf')(), function (req, res) {
    User.findOne({
      'local.resetToken': req.params.token,
      'local.resetExpires': {$gt: Date.now()}
    }, function (err, user) {
      if (err) {
        logger.debug(err);
      }
      if (!user) {
        req.flash('error', i18next.t('forgot.error.expired'));
        return res.redirect('/forgot');
      }
      res.render('account_reset', {
        email: '',
        meta: {title: i18next.t('title.default')},
        user: req.user,
        token: req.csrfToken()
      });
    });
  })
  .post(reset);

module.exports = router;
