var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer');
var async = require('async');
var crypto = require('crypto');
var User = require('../app/models/user');
var isLoggedIn = require('../app/middlewares/isloggedin');

// @doc: http://sahatyalkabov.com/how-to-implement-password-reset-in-nodejs/

var validateInput = function (req, res, next) {
  req.checkBody(['email'], 'Email is not valid.').isEmail();
  if (req.validationErrors()) {
    return res.render('forgot', {
      email: req.body.email,
      is_errors : true,
      errors    : req.validationErrors()
    });
  }
  next();
}

var forgot = function(req, res) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ 'local.email': req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.local.resetToken = token;
        user.local.resetExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport('SMTP', {
        ignoreTLS: true // TLS not work on smtp4dev Windows 8
      });
      var mailOptions = {
        to: user.local.email,
        from: 'contact@chatworldcup.com',
        subject: 'Roomly password reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('info', 'An e-mail has been sent to ' + user.local.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
//    if (err) return next(err);
    if (err) return console.log(err);
    res.redirect('/forgot');
  });
};

var reset = function(req, res) {
  if (!req.body.password || !req.body.confirm
    || req.body.password != req.body.confirm) {
    req.flash('error', 'Password doesn\'t correspond.');
    return res.redirect('back');
  }

  async.waterfall([
    function(done) {
      User.findOne({
        'local.resetToken': req.params.token,
        'local.resetExpires': { $gt: Date.now() }
      }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.local.password = user.generateHash(req.body.password);
        user.local.resetToken = undefined;
        user.local.resetExpires = undefined;

        user.save(function(err) {
          req.logIn(user, function(err) {
            done(err, user);
          });
        });
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport('SMTP', {
        ignoreTLS: true // TLS not work on smtp4dev Windows 8
      });
      var mailOptions = {
        to: user.local.email,
        from: 'contact@chatworldcup.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.local.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/');
  });
}

router.route('/forgot')
  .get(function (req, res) {
    res.render('forgot', {
    });
  })
  .post(validateInput, forgot);

router.route('/reset/:token')
  .get(function(req, res) {
    User.findOne({
      'local.resetToken': req.params.token,
      'local.resetExpires': { $gt: Date.now() }
    }, function(err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('reset', {
        user: req.user
      });
    });
  })
  .post(reset);

module.exports = router;