var logger = require('./logger').getLogger('templating', __filename);
var _ = require('underscore');
var jwt = require('jsonwebtoken');
var emailer = require('../io/emailer');
var conf = require('../../config/index');
var User = require('../models/user');
var Group = require('../models/group');
var pomeloBridge = require('../io/pomelo-bridge');

var sendWelcomeEmail = function (email, user, cb) {
  if (!user || !user.id || !user.username) {
    return cb('verify-email.sendWelcomeEmail error: invalids params');
  }

  // verification token with user profile inside
  var profile = {
    id: user.id,
    email: email
  };
  var token = jwt.sign(profile, conf.verify.secret, {expiresIn: conf.verify.expire});

  emailer.welcome(email, user, token, function (err) {
    if (err) {
      return cb('verify-emailer: ', err);
    }

    return cb(null);
  });
};

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

  emailer.verify(email, user, token, function (err) {
    if (err) {
      return cb('verify-emailer: ', err);
    }

    return cb(null);
  });
};

var sendGroupRequestEmail = function (user, email, groupId, cb) {
  // verification token with user profile inside
  var profile = {
    id: user.id,
    email: email,
    group_id: groupId
  };
  var token = jwt.sign(profile, conf.verify.secret, {expiresIn: conf.verify.expire});

  emailer.verify(email, user, token, function (err) {
    if (err) {
      return cb('verify-emailer: ', err);
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

  var done = function (user, payload) {
    payload.user_id = user.id;
    pomeloBridge.notify('chat', 'confirmedNotifyTask.notify', payload, cb);
  };

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
      return cb(null);
    }
    User.update(
      { _id: payload.id, 'emails.email': payload.email },
      { $set: {'emails.$.confirmed': true, confirmed: true} },
      function (err) {
        if (err) {
          return cb(err);
        }

        if (!payload.group_id) {
          return done(user, payload);
        }

        // special case of group membership with added email
        Group.update(
          {_id: payload.group_id},
          {
            $addToSet: {members: user._id},
            $pull: {emails_pending: {user: user._id}} // scope on user.id will remove all request for this user
          }
        ).exec(function (err) {
          if (err) {
            return cb(err);
          }

          return done(user, payload);
        });
      });
  });
};

module.exports = {
  sendEmail: sendEmail,
  validate: validate,
  sendWelcomeEmail: sendWelcomeEmail,
  sendGroupRequestEmail: sendGroupRequestEmail
};
