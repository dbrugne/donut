var express = require('express');
var router = express.Router();
var passport = require('passport');

var validateInput = function(req, res, next) {
  req.checkBody('email','Email should be a valid address.').isEmail();
  req.checkBody('password','Password should be filled.').isLength(1);
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
        successRedirect : '/',
        failureRedirect : '/login',
        failureFlash : true
    }));

router.get('/login/facebook', passport.authenticate('facebook', {
    scope : 'email'
}));

router.get('/login/facebook/callback', passport.authenticate('facebook', {
        successRedirect : '/account',
        failureRedirect : '/'
}));

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

module.exports = router;