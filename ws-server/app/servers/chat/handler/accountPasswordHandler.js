'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var emailer = require('../../../../../shared/io/emailer');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;

  async.waterfall([

    function check (callback) {
      if (!data.password || data.password.length < 6 || data.password.length > 50) {
        return callback('wrong-format');
      }

      // already have a password
      if (user.local.password) {
        if (!user.validPassword(data.current_password)) {
          return callback('wrong-password');
        }
      }

      return callback(null);
    },

    function save (callback) {
      user.local.password = user.generateHash(data.password);
      user.save(function (err) {
        if (err) {
          return callback(err);
        }

        if (!user.local.email) {
          return callback(null);
        }

        emailer.passwordChanged(user.local.email, callback);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('user:password:edit', next)(err);
    }
    return next(null, {success: true});
  });
};
