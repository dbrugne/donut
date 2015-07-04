var debug = require('debug')('shared:passport');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var FacebookTokenStrategy = require('passport-facebook-token').Strategy;
var conf = require('../../config/index');
var User = require('../models/user');
var emailer = require('../io/emailer');
var i18next = require('../util/i18next');
var keenio = require('../io/keenio');

// keen.io tracking
var keenIoTracking = function(user, type) {
  var keenEvent = {
    method: type || 'unknown',
    session: {
      device: 'browser'
    },
    user: {
      id: user._id.toString()
    }
  };
  keenio.addEvent('user_signup', keenEvent, function(err, res){
    if (err)
      debug('Error while tracking user_signup in keen.io for '+user._id.toString()+': '+err);
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

// email and password signup
passport.use('local-signup', new LocalStrategy({
    usernameField: 'email', // by default local strategy uses username
    passwordField: 'password',
    passReqToCallback: true
  },
  function (req, email, password, done) {
    process.nextTick(function () {

      if (req.user) {
        // happen for a user already authenticated with another method (e.g.: Facebook)
        var user = req.user;
        user.local.email = email;
        user.local.password = user.generateHash(password);
        user.lastlogin_at = Date.now();
        user.save(function (err) {
          if (err)
            throw err;

          return done(null, user);
        });

        return;
      }

      // find a user whose email is the same as the forms email
      // we are checking to see if the user trying to login already exists
      email = email.toLowerCase();
      User.findOne({ 'local.email': email }, function (err, user) {
        // if there are any errors, return the error
        if (err)
          return done(err);

        // check to see if theres already a user with that email
        if (user)
          return done(null, false, req.flash('error', i18next.t("account.email.error.alreadyexists")));

        // if there is no user with that email create him
        var newUser = User.getNewUser();
        newUser.local.email = email;
        newUser.local.password = newUser.generateHash(password);
        newUser.lastlogin_at = Date.now();

        // save the user
        newUser.save(function (err) {
          if (err)
            throw err;

          // tracking
          keenIoTracking(newUser, 'email');

          // email will be send on next tick but done() is called immediatly
          emailer.welcome(newUser.local.email, function(err) {
            if (err)
              return debug('Unable to sent welcome email: '+err);
          });

          return done(null, newUser);
        });
      });
    });

  }));

// email and password login
passport.use('local-login', new LocalStrategy({
    usernameField: 'email', // by default local strategy uses username
    passwordField: 'password',
    passReqToCallback: true
  },
  function (req, email, password, done) {

    // find a user whose email is the same as the forms email
    // we are checking to see if the user trying to login already exists
    var searchEmail = email.toLocaleLowerCase();
    User.findOne({ 'local.email': searchEmail }, function (err, user) {
      // if there are any errors, return the error before anything else
      if (err)
        return done(err);

      // if no user is found, return the message
      if (!user) {
        req.flash('email', email);
        return done(null, false, req.flash('error', i18next.t("account.error.invalid")));
      }

      // if the user is found but the password is wrong
      if (!user.validPassword(password)) {
        req.flash('email', email);
        return done(null, false, req.flash('error', i18next.t("account.error.invalid")));
      }

      // all is well, return successful user
      user.lastlogin_at = Date.now();
      user.save(function(err) {
        if (err)
          debug(err); // not a problem

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
  },
  function (req, token, refreshToken, profile, done) {
    process.nextTick(function () {

      if (!req.user) {

        User.findOne({ 'facebook.id': profile.id }, function (err, user) {
          if (err)
            return done(err);

          if (user) {
            user.lastlogin_at = Date.now();
            // if there is a user id already but no token (user was linked at one point and then removed)
            // just add our token and profile information
            if (!user.facebook.token) {
              user.facebook.token = token;
              user.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
              if (profile.emails)
                user.facebook.email = profile.emails[0].value;
            }
            user.save(function (err) {
              if (err)
                throw err;

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
            if (profile.emails)
              newUser.facebook.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first

            newUser.save(function (err) {
              if (err)
                throw err;

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
          if (err)
            return done(err);

          if (existingUser)
            return done(null, false,
              req.flash('error', i18next.t("account.facebook.error.alreadylinked")));

          // update the current users facebook credentials
          user.facebook.id = profile.id;
          user.facebook.token = token;
          user.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
          if (profile.emails)
            user.facebook.email = profile.emails[0].value;

          // save the user
          user.save(function (err) {
            if (err)
              throw err;
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
  }, function(accessToken, refreshToken, profile, done) {

    console.log(accessToken);
    console.log(profile);

    var facebookId = profile.id;
    User.findOne({ 'facebook.id': facebookId }, function (err, user) {
      if (err)
        return done(err);

      if (user) {

        user.lastlogin_at = Date.now();
        // if there is a user id already but no token (user was linked at one point and then removed)
        // just add our token and profile information
        if (!user.facebook.token) {
          user.facebook.token = accessToken;

          user.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
          if (profile.emails)
            user.facebook.email = profile.emails[0].value;
        }
        user.save(function (err) {
          if (err)
            return done(err);

          return done(null, user); // user found, return that user
        });


      } else {

        // create account (=signup)
        var newUser = User.getNewUser();
        newUser.lastlogin_at = Date.now();
        newUser.facebook.id = profile.id;
        newUser.facebook.token = accessToken;
        newUser.facebook.name = profile.name.givenName + ' ' + profile.name.familyName; // @todo :test
        newUser.name = profile.displayName; // @todo :test
        if (profile.emails)
          newUser.facebook.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first
        newUser.save(function (err) {
          if (err)
            return done(err);

          // tracking
          keenIoTracking(newUser, 'facebook');

          // if successful, return the new user
          return done(null, newUser);
        });

      }
    });
  }));


module.exports = passport;
