'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var User = require('../../../../../shared/models/user');
var emailer = require('../../../../../shared/io/emailer');
var validator = require('validator');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;

  var email;

  async.waterfall([

    function check (callback) {
      if (!data.email) {
        return callback('wrong-format');
      }

      email = data.email.toLocaleLowerCase();

      if (!validator.isEmail(email)) {
        return callback('wrong-format');
      }

      if (user.local && user.local.email && email === user.local.email.toLocaleLowerCase()) {
        return callback('same-mail');
      }

      return callback(null);
    },

    function exist (callback) {
      User.findOne({'local.email': email}, function (err, user) {
        if (err) {
          return callback(err);
        }
        if (user) {
          return callback('mail-already-exist');
        }

        return callback(null);
      });
    },

    function save (callback) {
      var oldEmail = (user.local && user.local.email)
        ? user.local.email
        : '';
      user.local.email = email;
      user.save(function (err) {
        if (err) {
          return callback(err);
        }

        emailer.emailChanged(email, function (err) {
          if (err) {
            return callback(err);
          }

          if (oldEmail === '' || oldEmail === email) {
            return callback(null);
          }

          // inform old email if different from new one
          emailer.emailChanged(oldEmail, callback);
        });
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('user:email:edit', next)(err);
    }
    return next(null, {success: true});
  });
};
