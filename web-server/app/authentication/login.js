'use strict';
var express = require('express');
var router = express.Router();
var passport = require('../../../shared/authentication/passport');
var i18next = require('../../../shared/util/i18next');
var bouncer = require('../middlewares/bouncer');
var logger = require('pomelo-logger').getLogger('web', __filename);
var isMobile = require('ismobilejs');

var validateInput = function (req, res, next) {
  req.checkBody('email', i18next.t('login.emailerror')).isEmail();
  req.checkBody('password', i18next.t('login.passworderror')).isLength(1);
  if (req.validationErrors()) {
    return res.render('login', {
      meta: {title: i18next.t('title.default')},
      userFields: {email: req.body.email},
      errors: req.validationErrors(),
      token: req.csrfToken(),
      isIphone: isMobile(req.headers['user-agent'] || 'unknown').apple.phone,
      isAndroid: isMobile(req.headers['user-agent'] || 'unknown').android.phone,
      isWindows: isMobile(req.headers['user-agent'] || 'unknown').windows.phone,
      isMobile: isMobile(req.headers['user-agent'] || 'unknown').phone
    });
  }

  return next();
};

router.route('/login')
  .get([require('csurf')()], function (req, res) {
    res.render('login', {
      meta: {title: i18next.t('title.default')},
      userFields: {email: req.flash('email')},
      token: req.csrfToken(),
      isIphone: isMobile(req.headers['user-agent'] || 'unknown').apple.phone,
      isAndroid: isMobile(req.headers['user-agent'] || 'unknown').android.phone,
      isWindows: isMobile(req.headers['user-agent'] || 'unknown').windows.phone,
      isMobile: isMobile(req.headers['user-agent'] || 'unknown').phone
    });
  })
  .post([require('csurf')(), validateInput, function (req, res, next) {
    passport.authenticate('local-login', function (err, user, info) {
      if (err) {
        var errorMessage;
        switch (err) {
          case 'invalid' :
            errorMessage = i18next.t('account.error.invalid');
            break;
          default :
            errorMessage = i18next.t('global.unknownerror');
        }
        return res.render('login', {
          meta: {title: i18next.t('title.default')},
          userFields: {email: req.body.email},
          errors: [{msg: errorMessage}],
          token: req.csrfToken(),
          isIphone: isMobile(req.headers['user-agent'] || 'unknown').apple.phone,
          isAndroid: isMobile(req.headers['user-agent'] || 'unknown').android.phone,
          isWindows: isMobile(req.headers['user-agent'] || 'unknown').windows.phone,
          isMobile: isMobile(req.headers['user-agent'] || 'unknown').phone
        });
      }
      req.logIn(user, function (err) {
        if (err) {
          return next(err);
        }
        return bouncer.redirect(req, res);
      });
    })(req, res, next);
  }], bouncer.redirect);

router.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

router.get('/login/facebook', passport.authenticate('facebook', {
  scope: 'email'
}));

router.get('/login/facebook/callback', passport.authenticate('facebook', {
  failureRedirect: '/'
}), bouncer.redirect);

router.get('/unlink/facebook', function (req, res) {
  var user = req.user;

  if (!user.local.email) {
    req.flash('warning', i18next.t('account.facebook.error.needemailpassword'));
    return res.redirect('/');
  }

  user.update({
    $unset: {
      'facebook.token': true,
      'facebook.id': true
    }
  }, function (err) {
    if (err) {
      logger.debug(err);
    }
    res.redirect('/!');
  });
});

module.exports = router;
