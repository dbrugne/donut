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
      meta: {title: i18next.t("title.default")},
      userFields: {email: req.body.email},
      errors: req.validationErrors(),
      token: req.csrfToken()
    });
  }

  return next();
};

router.route('/login')
    .get([require('csurf')()], function(req, res) {
        res.render('login', {
          meta: {title: i18next.t("title.default")},
          userFields: {email: req.flash('email')},
          token: req.csrfToken()
        });
    })
    .post([require('csurf')(), validateInput, passport.authenticate('local-login', {
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