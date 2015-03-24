var express = require('express');
var router = express.Router();
var passport = require('../../../shared/authentication/passport');
var i18next = require('../../../shared/util/i18next');
var bouncer = require('../middlewares/bouncer');

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
      errors: req.validationErrors(),
      token: req.csrfToken()
    });
  }

  return next();
};

router.route('/signup')
    .get([require('csurf')()], function(req, res) {
        res.render('signup', {
          layout: 'layout-form',
          partials: {head: '_head', foot: '_foot'},
          meta: {title: i18next.t("title.default")},
          token: req.csrfToken()
        });
    })
    .post([require('csurf')(), validateInput, passport.authenticate('local-signup', {
        failureRedirect : '/signup',
        failureFlash : true
    })], bouncer.redirect);

module.exports = router;