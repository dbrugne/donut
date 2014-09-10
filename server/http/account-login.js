var express = require('express');
var router = express.Router();
var passport = require('passport');
var i18next = require('../app/i18next');

var validateInput = function(req, res, next) {
  req.checkBody('email', i18next.t("login.emailerror")).isEmail();
  req.checkBody('password', i18next.t("login.passworderror")).isLength(1);
  if (req.validationErrors()) {
    console.log(req.validationErrors());
    return res.render('login', {
      userFields: {email: req.body.email},
      is_errors: true,
      errors: req.validationErrors()
    });
  }

  return next();
};

router.route('/login')
    .get(function(req, res) {
        res.render('login', {userFields: {email: req.flash('email')}});
    })
    .post(validateInput, passport.authenticate('local-login', {
        successRedirect : '/!',
        failureRedirect : '/login',
        failureFlash : true
    }));

router.get('/login/facebook', passport.authenticate('facebook', {
    scope : 'email'
}));

router.get('/login/facebook/callback', passport.authenticate('facebook', {
        successRedirect : '/!',
        failureRedirect : '/'
}));

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

var emailer = require('../app/emailer');
router.route('/test')
  .get(function(req, res) {

    callback = function(err) {
      if (err)
        return console.log('error while sending: '+err);

      return console.log('email sent');
    };

    emailer.welcome('yangs@yangs.net', req.get('host'), callback);
    emailer.forgot('yangs@yangs.net', req.get('host'), 'mon token à moi', callback);
    emailer.passwordChanged('yangs@yangs.net', req.get('host'), callback);
    emailer.emailChanged('yangs@yangs.net', req.get('host'), callback);

    res.render('test', {layout:false});
  })

module.exports = router;