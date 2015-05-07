var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var User = require('../../../shared/models/user');
var conf = require('../../../config/');

// @source: https://github.com/auth0/socketio-jwt#example-usage

/**
 * Route handler - retrieve user and return token from an "existing session"
 *
 * @cookie a valid session cookie
 * @response {token: String}
 */
router.route('/oauth/session')
    .get(function(req, res) {
      if (!req.user)
        return res.json({token: 'error: no valid cookie or session'});

      var allowed = req.user.isAllowedToConnect();
      if (!allowed.allowed)
        return res.json({token: 'error: user not allowed to connect'});

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
 * @post email
 * @post password
 * @response {token: String}
 */
router.route('/oauth/login')
    .post(function(req, res) {
      if (!req.body.email || !req.body.password)
        return res.json({token: 'error: no email or password'});

      User.findOne({'local.email': req.body.email}, function(err, user) {
        if (err)
          return res.json({token: 'error: '+err});
        if (!user)
          return res.json({token: 'error: unable to find user'});

        var allowed = user.isAllowedToConnect();
        if (!allowed.allowed)
          return res.json({token: 'error: user not allowed to connect'});

        // filter exported data
        var profile = {
          id: user.id,
          username: user.username,
          email: user.local.email
        };

        // We are sending the profile inside the token
        var token = jwt.sign(profile, conf.oauth.secret, { expiresInMinutes: conf.oauth.expire });

        res.json({token: token});
      });
    });

module.exports = router;