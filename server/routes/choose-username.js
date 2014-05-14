var express = require('express');
var router = express.Router();
var User = require('../app/models/user');
var isLoggedIn = require('../app/isloggedin');

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
  .post([
    isLoggedIn,
    function (req, res, next) {
      req.checkBody(['user', 'fields', 'username'], 'Username should be a string of min 2 and max 25 characters.').matches(/^[-a-z0-9_\\|[\]{}^`]{2,30}$/i);
      if (req.validationErrors()) {
        return res.render('choose_username', {
          userFields: req.body.user.fields,
          is_errors: true,
          errors: req.validationErrors(),
          scripts: [
            {src: '/validator.min.js'}
          ]
        });
      }

      req.sanitize(['user', 'fields', 'username']).escape();

      var r = new RegExp('^' + req.body.user.fields.username + '$', 'i');
      User.findOne({
        $and: [
          {'username': {$regex: r}},
          {_id: { $ne: req.user._id }}
        ]
      }, function (err, user) {
        if (err) {
          req.flash('error', 'Error while searching existing username: ' + err);
          return res.redirect('/account');
        }

        if (user) {
          return res.render('choose_username', {
            userFields: req.body.user.fields,
            error: 'This username is already taken by another user',
            scripts: [
              {src: '/validator.min.js'}
            ]
          });
        }

        return next();
      });
    }
  ], function (req, res) {
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