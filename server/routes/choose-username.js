var express = require('express');
var router = express.Router();
var User = require('../app/models/user');
var isLoggedIn = require('../app/isloggedin');

function validateInput (req, res, next) {
  req.checkBody(['user', 'fields', 'username'], 'Username should be a string of min 2 and max 25 characters.').isUsername();
  if (req.validationErrors()) {
    return res.render('choose_username', {
      userFields: req.body.user.fields,
      is_errors : true,
      errors    : req.validationErrors(),
      scripts   : [
        {src: '/validator.min.js'}
      ]
    });
  }
  next();
}

function validateAvailability(req, res, next) {
  var handleError = function (err) {
    return res.render('choose_username', {
      userFields: req.body.user.fields,
      error: err,
      scripts: [
        {src: '/validator.min.js'}
      ]
    });
  };
  req.user.usernameAvailability(
    req.body.user.fields.username, next, handleError);
}

router.route('/choose-username')
  .get(isLoggedIn, function (req, res) {
    var userFields = {username: req.username};
    res.render('choose_username', {
      userFields: userFields,
      scripts: [
        {src: '/validator.min.js'}
      ]
    });
  })
  .post([isLoggedIn, validateInput, validateAvailability], function (req, res) {
    req.user.username = req.body.user.fields.username;
    req.user.save(function (err) {
      if (err) {
        req.flash('error', err)
        return res.redirect('/');
      } else {
        res.redirect('/!');
      }
    });
  });

module.exports = router;