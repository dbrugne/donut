var express = require('express');
var router = express.Router();
var User = require('../app/models/user');
var isLoggedIn = require('../app/middlewares/isloggedin');

var validateInput = function (req, res, next) {
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

var validateAvailability = function (req, res, next) {
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

var hasNotUsername = function(req, res, next) {
  if (req.user.username) {
    // Avoid username modification when user has already a username set
    console.log('This user has already a username: '+req.user._id);
    return res.redirect('/!');
  }

  next();
}

router.route('/choose-username')
  .get(isLoggedIn, hasNotUsername, function (req, res) {
    res.render('choose_username', {
      scripts: [
        {src: '/validator.min.js'}
      ]
    });
  })
  .post([isLoggedIn, hasNotUsername, validateInput, validateAvailability], function (req, res) {
    req.user.username = req.body.user.fields.username;
    req.user.save(function (err) {
      if (err) {
        req.flash('error', err)
        return res.redirect('/');
      } else {
        return res.redirect('/!');
      }
    });
  });

module.exports = router;