'use strict';
var _ = require('underscore');
var errors = require('../../../util/errors');
var async = require('async');
var User = require('../../../../../shared/models/user');
var emailer = require('../../../../../shared/io/emailer');
var validator = require('validator');
var jwt = require('jsonwebtoken');
var conf = require('../../../../../config/index');
var disposableDomains = require('disposable-email-domains');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;

  var methods = [
    'add',        // Add the email to the list of user emails
    'delete',     // Delete the email from the list of user emails
    'validate'    // Send a validation email to user
  ];

  if (!data.email) {
    return errors.getHandler('user:email', next)('wrong-format');
  }

  var email = data.email.toLocaleLowerCase();

  if (!validator.isEmail(email)) {
    return errors.getHandler('user:email', next)('wrong-format');
  }

  var domain = data.email.split('@')[1];
  if (disposableDomains.indexOf(domain) !== -1) {
    return errors.getHandler('user:email', next)('domain');
  }

  if (!data.method || methods.indexOf(data.method) === -1) {
    return errors.getHandler('user:email', next)('params');
  }

  this[data.method](data.email, user, next);
};

handler.add = function (email, user, next) {
  var that = this;

  async.waterfall([

    function check (callback) {
      User.findOne({'emails.email': email}).exec(function (err, user) {
        if (err) {
          return callback(err);
        }
        if (user) {
          return callback('mail-already-exist');
        }

        return callback(null);
      });
    },

    function update (callback) {
      var emails = user.emails;
      emails.push({email: email, confirmed: false});
      user.emails = emails;
      user.save(function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('user:email:add', next)(err);
    }

    that.validate(email, user, next);
  });
};

handler.validate = function (email, user, next) {
  async.waterfall([

    function check (callback) {
      if (_.findWhere(user.emails, {email: email, confirmed: true})) {
        return callback('not-allowed');
      }

      return callback(null);
    },

    function sendMail (callback) {
      var profile = {
        id: user.id,
        email: email
      };
      var token = jwt.sign(profile, conf.verify.secret, {expiresIn: conf.verify.expire});
      emailer.verify(email, token, function (err) {
        if (err) {
          return callback(err);
        }

        return callback(null);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('user:email:validate', next)(err);
    }

    return next(null, {success: true});
  });
};

handler.delete = function (email, user, next) {
  async.waterfall([

    function check (callback) {
      if (!_.findWhere(user.emails, {email: email})) {
        return callback('not-found');
      }

      if ((user.local && user.local.email === email) || (user.facebook && user.facebook.email === email)) {
        return callback('permanent');
      }

      return callback(null);
    },

    function update (callback) {
      user.update({$pull: {emails: {email: email}}}, function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('user:email:delete', next)(err);
    }

    return next(null, {success: true});
  });
};
