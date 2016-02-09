'use strict';
var _ = require('underscore');
var errors = require('../../../util/errors');
var async = require('async');
var User = require('../../../../../shared/models/user');
var verifyEmail = require('../../../../../shared/util/verify-email');
var validator = require('validator');
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
  var group = session.__group__;

  var email = '';

  async.waterfall([
    function check (callback) {
      // group
      if (!data.group_id) {
        return callback('params-group-id');
      }
      if (!group.allowed_domains || group.allowed_domains.length < 1) {
        return callback('no-domain-configured-on-group');
      }
      if (group.isMember(user.id)) {
        return callback('already-member');
      }
      if (group.isBanned(user.id)) {
        return callback('group-banned');
      }

      // email
      if (!data.email) {
        return callback('params-email');
      }
      email = data.email.toLocaleLowerCase();
      if (!validator.isEmail(email)) {
        return callback('wrong-format');
      }
      var domain = data.email.split('@')[1].toLowerCase();
      if (disposableDomains.indexOf(domain) !== -1) {
        return callback('domain');
      }
      if (group.allowed_domains.indexOf('@' + domain) === -1) {
        return callback('domain-not-allowed-for-this-group');
      }
      if (group.isEmailPending(email)) {
        return callback('mail-already-exist');
      }

      // user
      if (user.emails && _.findWhere(user.emails, {email: email})) {
        return callback('mail-already-exist');
      }

      // other users
      User.findOne({'emails': {$elemMatch: {'email': email, 'confirmed': true}}}).exec(function (err, user) {
        if (err) {
          return callback(err);
        }
        if (user) {
          return callback('mail-already-exist');
        }

        return callback(null);
      });
    },
    function updateUser (callback) {
      var emails = user.emails;
      emails.push({email: email, confirmed: false});
      user.emails = emails;
      user.save(function (err) {
        return callback(err);
      });
    },
    function updateGroup (callback) {
      group.update({$addToSet: {emails_pending: { user: user._id, email: email }}}).exec(function (err) {
        return callback(err);
      });
    },
    function verify (callback) {
      verifyEmail.sendGroupRequestEmail(user, email, group.id, function (err) {
        return callback(err);
      });
    }
  ], function (err) {
    if (err) {
      return errors.getHandler('group:request:email', next)(err);
    }

    return next(null, {success: true});
  });
};
