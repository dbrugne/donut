var express = require('express');
var router = express.Router();
var passport = require('../../../shared/authentication/passport');
var User = require('../../../shared/models/user');
var i18next = require('../../../shared/util/i18next');

var validateEmail = function(req, res, next) {
  req.checkBody('email', i18next.t("account.email.error.format")).isEmail();
  if (req.validationErrors()) {
    return res.render('connect_local', {
      meta: {title: i18next.t("title.default")},
      userFields: req.body,
      errors: req.validationErrors()
    });
  }

  var pattern = req.body.email.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  var r = new RegExp('^'+pattern+'$', 'i');
  User.findOne({
    $and: [
      {'local.email': {$regex: r}},
      {_id: { $ne: req.user._id }}
    ]
  }, function(err, user) {
    if (err) {
      req.flash('error', 'Error while searching existing email: ' + err);
      return res.redirect('/connect/local');
    }

    if (user) {
      return res.render('connect_local', {
        meta: {title: i18next.t("title.default")},
        userFields: req.body,
        error: i18next.t("account.email.error.alreadyexists")
      });
    }

    return next();
  });
};

router.route('/connect/local')
    .get(function(req, res) {
        res.render('connect_local', {
          meta: {title: i18next.t("title.default")},
          userFields: {},
          message: req.flash('signupMessage')
        });
    })
    .post([validateEmail], passport.authenticate('local-signup', {
        successRedirect : '/!', // redirect to the secure profile section
        failureRedirect : '/connect/local', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

router.get('/connect/facebook', passport.authorize('facebook', { scope : 'email' }));

router.get('/connect/facebook/callback', passport.authorize('facebook', {
    successRedirect : '/!',
    failureRedirect : '/'
}));

router.get('/unlink/facebook', function(req, res) {
    var user = req.user;

    if (!user.local.email) {
        req.flash('warning', i18next.t("account.facebook.error.needemailpassword"));
        return res.redirect('/');
    }

    user.facebook.token = undefined;
    user.save(function(err) {
        res.redirect('/!');
    });
});

module.exports = router;