var express = require('express');
var router = express.Router();
var i18next = require('../app/i18next');
var bouncer = require('../app/middlewares/bouncer');
var colors = require('../config/colors');

router.get('/!', function(req, res) {

  // Is user authenticated
  if (!req.isAuthenticated()) {
    req.flash('warning', i18next.t("chat.shouldauthenticated"));
    return res.redirect('/');
  }

  // Has user a username
  if (!req.user.username) {
    return res.redirect('/choose-username');
  }

  // ... otherwise open chat

  bouncer.reset(req); // cleanup bouncer (not before cause other middleware can redirect
                      // browser before, e.g.: choose-username)

  return res.render('chat', {
    layout: false,
    partials: {head: '_head'},
    meta: {title: i18next.t("title.chat")},
    colors: colors.toString()
  });

});

module.exports = router;