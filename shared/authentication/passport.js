'use strict';
var logger = require('../util/logger').getLogger('passport', __filename);
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var FacebookTokenStrategy = require('passport-facebook-token');
var conf = require('../../config/index');
var User = require('../models/user');
var emailer = require('../io/emailer');
var i18next = require('../util/i18next');
var keenio = require('../io/keenio');

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
      User.findOne({ 'local.email': email }, function (err, user) {
        if (err) {
          return done(err);
        }

        if (user) {
          if (user.validPassword(password)) { // user type both password and mail of user so connect him
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
          newUser.save(function (err) {
            if (err) {
              throw err;
            }

            // tracking
            keenIoTracking(newUser, 'email');

            // email will be send on next tick but done() is called immediatly
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
var facebookStrategyOptions = {
  clientID: conf.facebook.clientID,
  clientSecret: conf.facebook.clientSecret,
  callbackURL: conf.facebook.callbackURL,
  passReqToCallback: true
};

passport.use(new FacebookStrategy(facebookStrategyOptions,
  function (req, token, refreshToken, profile, done) {
    process.nextTick(function () {
      if (!req.user) {
        User.findOne({ 'facebook.id': profile.id }, function (err, user) {
          if (err) {
            return done(err);
          }

          if (user) {
            user.lastlogin_at = Date.now();
            // if there is a user id already but no token (user was linked at
            // one point and then removed) just add our token and profile
            // information
            if (!user.facebook.token) {
              user.facebook.token = token;
              user.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
              if (profile.emails) {
                user.facebook.email = profile.emails[ 0 ].value;
              }
            }
            user.save(function (err) {
              if (err) {
                throw err;
              }

              return done(null, user); // user found, return that user
            });
          } else {
            // create account (=signup)
            var newUser = User.getNewUser();
            newUser.lastlogin_at = Date.now();
            newUser.facebook.id = profile.id;
            newUser.facebook.token = token;
            newUser.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
            newUser.name = profile.displayName;
            if (profile.emails) {
              newUser.facebook.email = profile.emails[ 0 ].value;
            } // facebook can return multiple emails so we'll take the first

            newUser.save(function (err) {
              if (err) {
                throw err;
              }

              // tracking
              keenIoTracking(newUser, 'facebook');

              // if successful, return the new user
              return done(null, newUser);
            });
          }
        });
      } else {
        // user already exists and is logged in, we have to link accounts
        var user = req.user;

        // Look for another user account that use this identifier
        User.findOne({ 'facebook.id': profile.id }, function (err, existingUser) {
          if (err) {
            return done(err);
          }

          if (existingUser) {
            return done(null, false,
              req.flash('error', i18next.t('account.facebook.error.alreadylinked')));
          }

          // update the current users facebook credentials
          user.facebook.id = profile.id;
          user.facebook.token = token;
          user.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
          if (profile.emails) {
            user.facebook.email = profile.emails[ 0 ].value;
          }

          // save the user
          user.save(function (err) {
            if (err) {
              throw err;
            }
            return done(null, user);
          });
        });
      }
    });
  }));

// Facebook (mobile, based on token)
passport.use(new FacebookTokenStrategy({
  clientID: conf.facebook.clientID,
  clientSecret: conf.facebook.clientSecret
}, function (accessToken, refreshToken, profile, done) {
  console.log(accessToken);
  console.log(profile);

  var facebookId = profile.id;
  User.findOne({ 'facebook.id': facebookId }, function (err, user) {
    if (err) {
      return done(err);
    }

    if (user) {
      user.lastlogin_at = Date.now();
      // if there is a user id already but no token (user was linked at one
      // point and then removed) just add our token and profile information
      if (!user.facebook.token) {
        user.facebook.token = accessToken;

        user.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
        if (profile.emails) {
          user.facebook.email = profile.emails[ 0 ].value;
        }
      }
      user.save(function (err) {
        if (err) {
          return done(err);
        }

        return done(null, user); // user found, return that user
      });
    } else {
      // create account (=signup)
      var newUser = User.getNewUser();
      newUser.lastlogin_at = Date.now();
      newUser.facebook.id = profile.id;
      newUser.facebook.token = accessToken;
      newUser.facebook.name = profile.name.givenName + ' ' + profile.name.familyName; // @todo dbr :test
      newUser.name = profile.displayName; // @todo dbr :test
      if (profile.emails) {
        newUser.facebook.email = profile.emails[ 0 ].value;
      } // facebook can return multiple emails so we'll take the first
      newUser.save(function (err) {
        if (err) {
          return done(err);
        }

        // tracking
        keenIoTracking(newUser, 'facebook');

        // if successful, return the new user
        return done(null, newUser);
      });
    }
  });
}));

module.exports = passport;
