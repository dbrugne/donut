'use strict';
var logger = require('../util/logger').getLogger('passport', __filename);
var _ = require('underscore');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var FacebookTokenStrategy = require('passport-facebook-token');
var conf = require('../../config/index');
var User = require('../models/user');
var emailer = require('../io/emailer');
var i18next = require('../util/i18next');
var keenio = require('../io/keenio');
var jwt = require('jsonwebtoken');

// keen.io tracking
var keenIoTracking = function (user, type) {
  var keenEvent = {
    method: type || 'unknown',
    session: {
      device: 'browser'
    },
    user: {
      id: user.id
    }
  };
  keenio.addEvent('user_signup', keenEvent, function (err, res) {
    if (err) {
      logger.error('Error while tracking user_signup in keen.io for ' + user.id + ': ' + err);
    }
  });
};

// serialize user for the session
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

// deserialize user
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

var localStrategyOptions = {
  usernameField: 'email', // by default LocalStrategy use username
  passwordField: 'password',
  passReqToCallback: true
};

// email and password signup
passport.use('local-signup', new LocalStrategy(localStrategyOptions,
  function (req, email, password, done) {
    process.nextTick(function () {
      // happen if user is already authenticated with another method (e.g.:
      // Facebook)
      if (req.user) {
        var user = req.user;

        // if user is already authenticated AND have email/password set we DON'T
        // override previous credentials
        if (!user.local.email) {
          user.local.email = email;
          user.local.password = user.generateHash(password);
        }

        user.lastlogin_at = Date.now();
        user.save(function (err) {
          if (err) {
            throw err;
          }

          done(null, user);
        });
        return;
      }

      // find existing user with this email
      email = email.toLowerCase();
      User.findOne({ $or: [{'local.email': email}, {'emails.email': email}] }, function (err, user) {
        if (err) {
          return done(err);
        }

        if (user) {
          // user type both password and mail of user so connect him
          if (user.local && user.local.email === email && user.validPassword(password)) {
            return done(null, user);
          } else {
            return done('email-alreadyexists');
          }
        }

        req.checkBody('username', i18next.t('choose-username.usernameerror')).isUsername();
        if (req.validationErrors()) {
          return done('usernameerror');
        }

        User.usernameAvailability(req.body.username, function (err) {
          if (err) {
            return done(err);
          }

          // create
          var newUser = User.getNewUser();
          newUser.local.email = email;
          newUser.local.password = newUser.generateHash(password);
          newUser.username = req.body.username;
          newUser.lastlogin_at = Date.now();
          newUser.emails.push({email: email});
          newUser.save(function (err) {
            if (err) {
              throw err;
            }

            // tracking
            keenIoTracking(newUser, 'email');

            // email will be send on next tick but done() is called immediatly
            // verification token with user profile inside
            var profile = {
              id: newUser.id,
              email: newUser.local.email
            };
            var token = jwt.sign(profile, conf.verify.secret, {expiresIn: conf.verify.expire});

            emailer.verify(newUser.local.email, token, function (err) {
              if (err) {
                return logger.error('Unable to sent verify email: ' + err);
              }
            });
            emailer.welcome(newUser.local.email, function (err) {
              if (err) {
                return logger.error('Unable to sent welcome email: ' + err);
              }
            });
            return done(null, newUser);
          });
        });
      });
    });
  }));

// email and password login
passport.use('local-login', new LocalStrategy(localStrategyOptions,
  function (req, email, password, done) {
    // find a user whose email is the same as the forms email
    // we are checking to see if the user trying to login already exists
    var searchEmail = email.toLocaleLowerCase();
    User.findOne({ 'local.email': searchEmail }, function (err, user) {
      // if there are any errors, return the error before anything else
      if (err) {
        return done(err);
      }

      // if no user is found, return the message
      if (!user) {
        return done('invalid');
      }

      // if the user is found but the password is wrong
      if (!user.validPassword(password)) {
        return done('invalid');
      }

      // all is well, return successful user
      user.lastlogin_at = Date.now();
      user.save(function (err) {
        if (err) {
          logger.error(err);
        } // not a problem

        return done(null, user);
      });
    });
  }));

// Facebook (Web browser, based on current Facebook session)
passport.use(new FacebookStrategy({
  clientID: conf.facebook.clientID,
  clientSecret: conf.facebook.clientSecret,
  callbackURL: conf.facebook.callbackURL,
  passReqToCallback: true
}, facebookCallback));

// Facebook (mobile, based on token)
passport.use(new FacebookTokenStrategy({
  clientID: conf.facebook.clientID,
  clientSecret: conf.facebook.clientSecret
}, function (token, refreshToken, profile, done) {
  facebookCallback({}, token, refreshToken, profile, done);
}));

function facebookCallback (req, token, refreshToken, profile, done) {
  process.nextTick(function () {
    // look for existing user with this profile.id
    User.findOne({ 'facebook.id': profile.id }, function (err, existingUser) {
      if (err) {
        return done(err);
      }

      // user is logged and try to authenticate with already used Facebook account
      if (req.user && req.user.id !== existingUser.id) {
        console.warn('passport alreadylinked error');
        return done(null, false,
          req.flash('error', i18next.t('account.facebook.error.alreadylinked')));
      }

      var user = req.user || User.getNewUser();

      user.facebook.id = profile.id;
      user.facebook.token = token;
      decorateUserWithFacebookProfile(user, profile);

      user.confirmed = true;
      user.lastlogin_at = Date.now();

      // tracking
      if (user.isNew) {
        keenIoTracking(user, 'facebook');
      }

      user.save(function (err) {
        done(err, user);
      });
    });
  });
}

function parseFacebookRealname (profile) {
  if (!profile || !profile.displayName || !profile.displayName.length) {
    return;
  }

  if (profile.displayName.length <= 20) {
    return profile.displayName;
  }

  if (!profile.name || (!profile.name.givenName && !profile.name.familyName)) {
    return profile.displayName.substr(0, 20);
  }

  if (profile.name.givenName && !profile.name.familyName) {
    return profile.name.givenName.substr(0, 20);
  }

  if (!profile.name.givenName && profile.name.familyName) {
    return profile.name.familyName.substr(0, 20);
  }

  // we get both givenName and familyName

  var realname = profile.name.givenName + ' ' + profile.name.familyName;
  if (realname.length <= 20) {
    return realname;
  }

  realname = profile.name.givenName.charAt(0).toUpperCase() + '.';
  realname += ' ' + profile.name.familyName;
  return realname.substr(0, 20);
}

function decorateUserWithFacebookProfile (user, profile) {
  // name
  var realname = parseFacebookRealname(profile);
  if (!user.realname && realname) {
    user.realname = realname;
  }
  if (profile.displayName) {
    user.facebook.name = profile.displayName;
  }

  // email
  if (!profile.emails && !profile.emails[0] && !_.isString(profile.emails[0].value)) {
    return;
  }

  var _email = profile.emails[0].value.toLowerCase();
  user.facebook.email = _email;

  if (user.local && !user.local.email) {
    user.local.email = _email;
  }

  if (!_.isArray(user.emails)) {
    user.emails = [];
  }

  var exists = _.find(user.emails, function (doc) {
    return (doc.email === _email);
  });

  if (!exists) {
    user.emails.push({email: _email, confirmed: true});
  }
}

module.exports = passport;
