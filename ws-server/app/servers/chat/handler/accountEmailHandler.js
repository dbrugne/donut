var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
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

    function check(callback) {
      if (!data.email)
        return callback('wrong-format');

      email = data.email.toLocaleLowerCase();

      if (!validator.isEmail(email))
        return callback('wrong-format');

      if (email === user.local.email.toLocaleLowerCase())
        return callback('same-mail');

      return callback(null);
    },

    function exist(callback) {
      User.findOne({'local.email': email}, function(err, user) {
        if (err)
          return callback(err);
        if (user)
          return callback('exist');

        return callback(null);
      });
    },

    function save(callback) {
      var oldEmail = (user.local && user.local.email)
        ? user.local.email
        : '';
      user.local.email = email;
      user.save(function(err) {
        if (err)
          return callback(err);

        emailer.emailChanged(email, function(err) {
          if (err)
            return callback(err);

          if (oldEmail === email)
            return callback(null);

          // inform old email if different from new one
          emailer.emailChanged(oldEmail, callback);
        });
      });
    },

  ], function(err) {
    if (err) {
      logger.error('[user:email:edit] ' + err);

      err = (['wrong-format', 'same-mail', 'exist'].indexOf(err) !== -1)
        ? err
        : 'internal';
      return next(null, { code: 500, err: err });
    }
    return next(null, { success: true });
  });
};