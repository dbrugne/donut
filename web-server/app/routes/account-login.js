var express = require('express');
var router = express.Router();
var passport = require('../../../shared/authentication/passport');
var i18next = require('../../../shared/util/i18next');
var bouncer = require('../middlewares/bouncer');

var validateInput = function(req, res, next) {
  req.checkBody('email', i18next.t("login.emailerror")).isEmail();
  req.checkBody('password', i18next.t("login.passworderror")).isLength(1);
  if (req.validationErrors()) {
    return res.render('login', {
      layout: 'layout-form',
      partials: {head: '_head', foot: '_foot'},
      meta: {title: i18next.t("title.default")},
      userFields: {email: req.body.email},
      is_errors: true,
      errors: req.validationErrors()
    });
  }

  return next();
};

router.route('/login')
    .get(function(req, res) {
        res.render('login', {
          layout: 'layout-form',
          partials: {head: '_head', foot: '_foot'},
          meta: {title: i18next.t("title.default")},
          userFields: {email: req.flash('email')}
        });
    })
    .post([validateInput, passport.authenticate('local-login', {
        failureRedirect : '/login',
        failureFlash : true
    })], bouncer.redirect);

router.get('/login/facebook', passport.authenticate('facebook', {
  scope : 'email'
}));

router.get('/login/facebook/callback', passport.authenticate('facebook', {
  failureRedirect : '/'
}), bouncer.redirect);

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

module.exports = router;