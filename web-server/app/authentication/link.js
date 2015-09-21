'use strict';
var express = require('express');
var router = express.Router();
var passport = require('../../../shared/authentication/passport');
var i18next = require('../../../shared/util/i18next');
var logger = require('../../../shared/util/logger').getLogger('web', __filename);

router.get('/connect/facebook', passport.authorize('facebook', { scope: 'email' }));

router.get('/connect/facebook/callback', passport.authorize('facebook', {
  successRedirect: '/!',
  failureRedirect: '/'
}));

router.get('/unlink/facebook', function (req, res) {
  var user = req.user;

  if (!user.local.email) {
    req.flash('warning', i18next.t('account.facebook.error.needemailpassword'));
    return res.redirect('/');
  }

  user.facebook.token = undefined;
  user.save(function (err) {
    logger.debug(err);
    res.redirect('/!');
  });
});

module.exports = router;
