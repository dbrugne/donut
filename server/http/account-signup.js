var express = require('express');
var router = express.Router();
var passport = require('passport');
var i18next = require('../app/i18next');
var bouncer = require('../app/middlewares/bouncer');

var validateInput = function(req, res, next) {
  req.checkBody('email', i18next.t("account.email.error.format")).isEmail();
  req.checkBody('password', i18next.t("account.password.error.length")).isLength(6, 50);
  if (req.validationErrors()) {
    return res.render('signup', {
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

router.route('/signup')
    .get(function(req, res) {
        res.render('signup', {
          layout: 'layout-form',
          partials: {head: '_head', foot: '_foot'},
          meta: {title: i18next.t("title.default")}
        });
    })
    .post([validateInput, passport.authenticate('local-signup', {
        failureRedirect : '/signup',
        failureFlash : true
    })], bouncer.redirect);

module.exports = router;