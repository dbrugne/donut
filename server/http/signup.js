var express = require('express');
var router = express.Router();
var passport = require('passport');

var validateInput = function(req, res, next) {
  req.checkBody('email','Email should be a valid address.').isEmail();
  req.checkBody('password','Password should be at least 6 characters.').isLength(6, 50);
  if (req.validationErrors()) {
    return res.render('signup', {
      userFields: {email: req.body.email},
      is_errors: true,
      errors: req.validationErrors(),
      scripts: [{src: '/validator.min.js'}]
    });
  }

  return next();
};

router.route('/signup')
    .get(function(req, res) {
        res.render('signup', {});
    })
    .post(validateInput, passport.authenticate('local-signup', {
        successRedirect : '/',
        failureRedirect : '/signup',
        failureFlash : true
    }));

module.exports = router;