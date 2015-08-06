var debug = require('debug')('donut:oauth');
var async = require('async');
var _ = require('underscore');
var express = require('express');
var router = express.Router();
var passport = require('../../../shared/authentication/passport');
var emailer = require('../../../shared/io/emailer');
var jwt = require('jsonwebtoken');
var User = require('../../../shared/models/user');
var expressValidator = require('express-validator');
var keenio = require('../../../shared/io/keenio');
var conf = require('../../../config/');
var common = require('donut-common');

// @source: https://github.com/auth0/socketio-jwt#example-usage

/**
 * Route handler - retrieve user and return token from an "existing session"
 *
 * Used by Web client
 *
 * @cookie a valid session cookie
 * @response {token: String}
 */
router.route('/oauth/get-token-from-session')
    .get(function(req, res) {
      if (!req.user)
        return res.json({err: 'no valid cookie or session'});

      var allowed = req.user.isAllowedToConnect();
      if (!allowed.allowed)
        return res.json(allowed);

      // filter exported data
      var profile = {
        id: req.user.id,
        username: req.user.username,
        email: req.user.local.email
      };

      // We are sending the profile inside the token
      var token = jwt.sign(profile, conf.oauth.secret, { expiresInMinutes: conf.oauth.expire });

      res.json({token: token});
    });

/**
 * Route handler - retrieve user and return token from "email/password"
 *
 * Used by mobile client
 *
 * @post email
 * @post password
 * @response {token: String}
 */
router.route('/oauth/get-token-from-credentials')
    .post(function(req, res) {
      if (!req.body.email || (!req.body.password && !req.body.code))
        return res.json({err: 'no-email-or-password'});

      User.findOne({'local.email': req.body.email}, function(err, user) {
        if (err) {
          debug('internal error: '+err);
          return res.json({err: 'internal-error'});
        }
        if (!user)
          return res.json({err: 'unknown'});

        var response = {};

        // check for password or secure code
        if (req.body.password) {
          if (!user.validPassword(req.body.password))
            return res.json({err: 'wrong'});

          // return additionally a secure code for next login (avoid storing of password on device)
          response.code = jwt.sign({id: user.id}, conf.oauth.secret, {});
        } else {

          try {
            var payload = jwt.verify(req.body.code, conf.oauth.secret, {});
            if (payload.id !== user.id) {
              debug('Error within oauth by secure code: secure code not correspond to this user');
              return res.json({err: 'invalid'});
            }
          } catch (e) {
            debug('Error within oauth by secure code: '+ e.message);
            return res.json({err: 'invalid'});
          }
        }

        var allowed = user.isAllowedToConnect();
        if (!allowed.allowed && allowed.err === 'no-username')
          response.err = allowed.err;
        else if (!allowed.allowed)
          return res.json(allowed);

        // authentication token with user profile inside
        var profile = {
          id: user.id,
          username: user.username,
          email: user.local.email
        };
        response.token = jwt.sign(profile, conf.oauth.secret, { expiresInMinutes: conf.oauth.expire });

        res.json(response);
      });
    });

/**
 * Route handler - check token and associated session validity
 *
 * Used by mobile client to preflight stored token
 *
 * @post token
 * @response {validity: Boolean}
 */
router.route('/oauth/check-token')
  .post(function(req, res) {
    if (!req.body.token)
      return res.json({err: 'no-token'});

    jwt.verify(req.body.token, conf.oauth.secret, function(err, decoded) {
      if (err) {
        debug('Error while checking oauth token: '+err);
        return res.json({validity: false});
      }
      if (!decoded.id) {
        debug('oauth token is invalid', decoded);
        return res.json({validity: false});
      }

      return res.json({validity: true});
    });
  });

/**
 * Route handler - authenticate a user based on a Facebook access token
 *
 * Used by mobile client on Facebook login/signup process
 *
 * @post access_token
 * @response {token: String}
 */
router.route('/oauth/get-token-from-facebook')
  .post(
  passport.authenticate('facebook-token'), // delegate Facebook token validation to passport-facebook-token
  function (req, res) {
    if (!req.user)
      return res.json({err: 'unable to retrieve this user'});

    var response = {};

    var allowed = req.user.isAllowedToConnect();
    if (!allowed.allowed && allowed.err === 'no-username')
      response.err = allowed.err;
    else if (!allowed.allowed)
      return res.json(allowed);

    // authentication token with user profile inside
    var profile = {
      id: req.user.id,
      username: req.user.username,
      facebook_id: req.user.facebook.id
    };
    response.token = jwt.sign(profile, conf.oauth.secret, { expiresInMinutes: conf.oauth.expire });

    res.json(response);
  }
);

/**
 * Route handler - save username on account designed by token
 *
 * Used by mobile client to save username (e.g.: after Facebook signup)
 *
 * @post token
 * @post username
 * @response {}
 */
router.route('/oauth/save-username')
  .post(function(req, res) {
    if (!req.body.token)
      return res.json({err: 'no-token'});
    var username = req.body.username;
    if (!username)
      return res.json({err: 'no-username'});

    jwt.verify(req.body.token, conf.oauth.secret, function(err, decoded) {
      if (err) {
        debug('Error while saving username: '+err);
        return res.json({err: 'internal'});
      }

      if (!common.validateUsername(username))
        return res.json({err: 'invalid'});

      User.findOne({ _id: decoded.id }, function (err, user) {
        if (err) {
          debug('Error while retrieving user: '+err);
          return res.json({err: 'internal'});
        }

        user.usernameAvailability(username, function(err) {
          if (err) {
            if (err === 'not-available')
              return res.json({err: 'not-available'});
            else {
              debug('Error while checking username availability: '+err);
              return res.json({err: 'internal'});
            }
          }

          user.update({$set: {username: username} }, function(err) {
            if (err) {
              debug('Error while saving username: '+err);
              return res.json({err: 'internal'});
            }
            return res.json({ success: true }); // success
          });
        });

      });
    });
  });

/**
 * Route handler - signup account with email, username and password
 *
 * Used by mobile client
 *
 * @post email
 * @post password
 * @post username
 * @response {}
 */
router.route('/oauth/signup')
  .post(function(req, res) {
    var email = req.body.email;
    var password = req.body.password;
    var username = req.body.username;

    async.waterfall([
      
      function checkData(callback) {
        if (!email)
          return callback('no-email');
        if (!password)
          return callback('no-password');
        if (!username)
          return callback('no-username');

        if (!expressValidator.validator.isEmail(email))
          return callback('invalid-email');
        if (!expressValidator.validator.isLength(password, 6, 50))
          return callback('invalid-password');
        if (!expressValidator.validator.isUsername(username))
          return callback('invalid-username');

        // lowercase email
        email = email.toLowerCase();
        
        return callback(null);
      },

      function checkExistingAccount(callback) {
        User.findOne({ 'local.email': email }, function (err, user) {
          if (err)
            return callback({err: 'internal', detail: err});
          if (user)
            return callback('existing-user');

          return callback(null);
        });
      },

      function checkUsernameAvailability(callback) {
        User.usernameAvailability(username, function (err) {
          if (err === 'not-available')
            return callback('not-available');
          else if (err)
            return callback({err: 'internal', detail: err});

          return callback(null);
        });
      },

      function create(callback) {
        var user = User.getNewUser();
        user.local.email      = email;
        user.local.password   = user.generateHash(password);
        user.username         = username;
        user.lastlogin_at     = Date.now();
        user.save(function(err) {
          if (err)
            return callback({err: 'internal', detail: err});
          return callback(null, user);
        });
      },

      function email(user, callback) {
        emailer.welcome(user.local.email, function(err) {
          if (err)
            return debug('Unable to sent welcome email: '+err);
        });
        return callback(null, user);
      },

      function tracking(user, callback) {
        var keenEvent = {
          method: 'email',
          session: {
            device: 'mobile'
          },
          user: {
            id: user.id
          }
        };
        keenio.addEvent('user_signup', keenEvent, function(err){
          if (err)
            debug('Error while tracking user_signup in keen.io for '+user.id+': '+err);

          return callback(null, user);
        });
      },

      function generateToken(user, callback) {
        var profile = {
          id        : user.id,
          username  : user.username,
          email     : user.local.email
        };
        var token = jwt.sign(profile, conf.oauth.secret, { expiresInMinutes: conf.oauth.expire });
        return callback(null, token);
      }
      
    ], function(err, token) {
      if (_.isObject(err)) {
        debug('Error while signuping new mobile user: '+err.detail);
        return res.json({err: err.err});
      } else if (err) {
        return res.json({err: err});
      }

      return res.json({success: true, token: token});
    });

  });

module.exports = router;