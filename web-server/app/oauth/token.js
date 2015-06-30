var debug = require('debug')('donut:oauth');
var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var User = require('../../../shared/models/user');
var conf = require('../../../config/');

// @source: https://github.com/auth0/socketio-jwt#example-usage

/**
 * Route handler - retrieve user and return token from an "existing session"
 *
 * Used by Web client
 *
 * @cookie a valid session cookie
 * @response {token: String}
 */
router.route('/oauth/session')
    .get(function(req, res) {
      if (!req.user)
        return res.json({err: 'no valid cookie or session'});

      var allowed = req.user.isAllowedToConnect();
      if (!allowed.allowed)
        return res.json({err: 'user not allowed to connect'});

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
router.route('/oauth/login')
    .post(function(req, res) {
      if (!req.body.email || (!req.body.password && !req.body.code))
        return res.json({err: 'no email or password provided'});

      User.findOne({'local.email': req.body.email}, function(err, user) {
        if (err)
          return res.json({err: 'internal error: '+err});
        if (!user)
          return res.json({err: 'unable to find user'});

        var response = {};

        // check for password or secure code
        if (req.body.password) {
          if (!user.validPassword(req.body.password))
            return res.json({err: 'invalid password provided'});

          // return additionally a secure code for next login (avoid storing of password on device)
          response.code = jwt.sign({id: user.id}, conf.oauth.secret, {});
        } else {

          try {
            var payload = jwt.verify(req.body.code, conf.oauth.secret, {});
            if (payload.id !== user.id) {
              debug('Error within oauth by secure code: secure code not correspond to this user');
              return res.json({err: 'invalid code provided'});
            }
          } catch (e) {
            debug('Error within oauth by secure code: '+ e.message);
            return res.json({err: 'invalid code provided'});
          }
        }

        var allowed = user.isAllowedToConnect();
        if (!allowed.allowed)
          return res.json({err: 'user not allowed to connect'});

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
router.route('/oauth/check')
  .post(function(req, res) {
    if (!req.body.token)
      return res.json({err: 'no token provided'});

    jwt.verify(req.body.token, conf.oauth.secret, function(err, decoded) {
      if (err) {
        debug('Error while checking oauth token: '+err);
        return res.json({validity: false});
      }
      if (!decoded.username) {
        debug('oauth token is invalid', decoded);
        return res.json({validity: false});
      }

      return res.json({validity: true});
    });
  });

module.exports = router;