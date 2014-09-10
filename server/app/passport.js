var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var User = require('./models/user');
var emailer = require('./emailer');
var conf = require('../config/index');
var i18next = require('./i18next');

// =========================================================================
// passport session setup ==================================================
// =========================================================================
// required for persistent login sessions
// passport needs ability to serialize and unserialize users out of session

// used to serialize the user for the session
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

// =========================================================================
// LOCAL SIGNUP ============================================================
// =========================================================================
// we are using named strategies since we have one for login and one for signup
// by default, if there was no name, it would just be called 'local'
passport.use('local-signup', new LocalStrategy({
    // by default, local strategy uses username and password, we will override with email
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true // allows us to pass back the entire request to the callback
  },
  function (req, email, password, done) {
    // asynchronous
    // User.findOne wont fire unless data is sent back
    process.nextTick(function () {

      if (req.user) {
        // happen for a user already authenticated with another method (e.g.: Facebook)
        var user = req.user;
        user.local.email = email;
        user.local.password = user.generateHash(password);
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

        // save the user
        newUser.save(function (err) {
          if (err)
            throw err;

          // email will be send on next tick but done() is called immediatly
          emailer.welcome(newUser.local.email, req.get('host'), function(err) {
            if (err)
              return console.log('Unable to sent welcome email: '+err);
          });

          return done(null, newUser);
        });
      });
    });

  }));

// =========================================================================
// LOCAL LOGIN =============================================================
// =========================================================================
// we are using named strategies since we have one for login and one for signup
// by default, if there was no name, it would just be called 'local'

passport.use('local-login', new LocalStrategy({
    // by default, local strategy uses username and password, we will override with email
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true // allows us to pass back the entire request to the callback
  },
  function (req, email, password, done) { // callback with email and password from our form

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
      return done(null, user);
    });

  }));

// =========================================================================
// FACEBOOK ================================================================
// =========================================================================
passport.use(new FacebookStrategy({
    clientID: conf.facebook.clientID,
    clientSecret: conf.facebook.clientSecret,
    callbackURL: conf.facebook.callbackURL,
    passReqToCallback: true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
  },

  // facebook will send back the token and profile
  function (req, token, refreshToken, profile, done) {

    // asynchronous
    process.nextTick(function () {

      // check if the user is already logged in
      if (!req.user) {

        // find the user in the database based on their facebook id
        User.findOne({ 'facebook.id': profile.id }, function (err, user) {

          // if there is an error, stop everything and return that
          // ie an error connecting to the database
          if (err)
            return done(err);

          // if the user is found, then log them in
          if (user) {
            // if there is a user id already but no token (user was linked at one point and then removed)
            // just add our token and profile information
            if (!user.facebook.token) {
              user.facebook.token = token;
              user.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
              user.facebook.email = profile.emails[0].value;

              user.save(function (err) {
                if (err)
                  throw err;
                return done(null, user);
              });
            }

            return done(null, user); // user found, return that user
          } else {
            // if there is no user found with that facebook id, create them
            var newUser = User.getNewUser();

            // set all of the facebook information in our user model
            newUser.facebook.id = profile.id; // set the users facebook id
            newUser.facebook.token = token; // we will save the token that facebook provides to the user
            newUser.facebook.name = profile.name.givenName + ' ' + profile.name.familyName; // look at the passport user profile to see how names are returned
            newUser.facebook.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first

            // prefill global data with Facebook profile (only on local profile creation)
            newUser.name = profile.displayName;
            if (profile._json.location && profile._json.location.name)
              newUser.location = profile._json.location.name;

            // save our user to the database
            newUser.save(function (err) {
              if (err)
                throw err;

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

module.exports = passport;
