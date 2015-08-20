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

handler.email = function (data, session, next) {

  var user = session.__currentUser__;

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.user_id)
        return callback('id is mandatory');

      if (!validator.isEmail(data.user_new_mail))
        return callback('wrong-format');

      if (data.user_new_mail === user.local.email)
        return callback('same-mail');

      return callback(null);
    },

    function exist(callback) {
      User.findOne({'local.email': data.user_new_mail.toLowerCase()}, function(err, user) {
        if (err) {
          return callback('Error while searching existing email: ' + err);
        }
        if (user) {
          return callback('exist');
        }
        return callback(null);
      });
    },

    function save(callback) {
      var email = data.user_new_mail;
      user.local.email = email.toLowerCase();
      user.save(function() {
        emailer.emailChanged(user.local.email, function(err) {
          if (err)
            return callback('Unable to sent email changed email: '+err);
        });
      });
      return callback(null);
    }

  ], function(err) {
    if (err) {
      if (err == 'wrong-format' || err == 'same-mail' || err == 'exist')
        return next(null, {code: 500, err: err});
      else
      {
        logger.error('[user:email:edit] ' + err);
        return next(null, {code: 520, err: err});
      }
    }

    return next(null, {});
  });
};

handler.password = function (data, session, next) {

  var user = session.__currentUser__;

  var that = this;

  async.waterfall([
    function check(callback) {
      return callback(null);
    },

    function check(callback) {
      if (!data.user_id)
        return callback('id is mandatory');

      if(data.user_password.length < 6 || data.user_password.length > 50)
        return callback('length');

      return callback(null);
    },

    function save(callback) {
      user.local.password = user.generateHash(data.user_password);
      user.save(function () {
        emailer.passwordChanged(user.local.email, function (err) {
          if (err)
            return console.log('Unable to sent password changed email: ' + err);
        });
      });
      return callback(null);
    }

  ], function(err) {
    if (err) {
      if (err == 'length')
        return next(null, {code: 500, err: err});
      else
      {
        logger.error('[user:password:edit] ' + err);
        return next(null, {code: 520, err: err});
      }
    }

    return next(null, {});
  });
};