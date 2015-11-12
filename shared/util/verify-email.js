var logger = require('./logger').getLogger('templating', __filename);
var _ = require('underscore');
var jwt = require('jsonwebtoken');
var emailer = require('../io/emailer');
var conf = require('../../config/index');
var User = require('../models/user');
var pomeloBridge = require('../io/pomelo-bridge');

var sendEmail = function (user, email, cb) {
  if (!user || !user.id || !user.emails || user.emails.length < 1) {
    return cb('verify-email.sendEmail error: invalids params');
  }

  // email already validate
  if (_.findWhere(user.emails, {email: email, confirmed: true})) {
    return cb('not-allowed');
  }

  // verification token with user profile inside
  var profile = {
    id: user.id,
    email: email
  };
  var token = jwt.sign(profile, conf.verify.secret, {expiresIn: conf.verify.expire});

  emailer.verify(email, token, function (err) {
    if (err) {
      return cb('verify-emailer: ' + err);
    }

    return cb(null);
  });
};

var validate = function (token, cb) {
  if (!token) {
    return cb('verify-email.verify error: invalids params');
  }

  var payload;
  try {
    payload = jwt.verify(token, conf.verify.secret, {});
  } catch (e) {
    logger.error('Error within verify-emailer by token code: ' + e.message);
    return cb('invalid');
  }

  User.findOne({
    '_id': payload.id,
    'emails.email': payload.email
  }, function (err, user) {
    if (err) {
      return cb(err);
    }
    if (!user) {
      return cb('invalid');
    }
    if (_.findWhere(user.emails, {email: payload.email, confirmed: true})) {
      return cb('already-validate');
    }
    User.update(
      { _id: payload.id, 'emails.email': payload.email },
      { $set: {'emails.$.confirmed': true, confirmed: true} },
      function (err) {
        if (err) {
          return cb(err);
        }

        if (user.confirmed) {
          return cb(null);
        }

        pomeloBridge.notify('chat', 'confirmedNotifyTask.notify', {user_id: user.id}, cb);
      });
  });
};

module.exports = {
  sendEmail: sendEmail,
  validate: validate
};
