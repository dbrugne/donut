'use strict';
var express = require('express');
var router = express.Router();
var i18next = require('../../../shared/util/i18next');
var bouncer = require('../middlewares/bouncer');
var colors = require('../../../config/colors');
var hello = require('../../../shared/util/helloDolly');

router.get('/!', function (req, res) {
  // Is user authenticated
  if (!req.isAuthenticated()) {
    // set Flash message (display on profile page or landing page depending
    // requested URL hash)
    req.flash('warning', i18next.t('chat.shouldauthenticated'));

    // render an HTML DOM that redirect browser on corresponding profile page
    return res.render('chat_track_anchor', {
      meta: {title: i18next.t('title.chat')},
      colors: colors.toString()
    });
  }

  // Has user a username
  if (!req.user.username) {
    return res.redirect('/choose-username');
  }

  // ... otherwise open chat

  // cleanup bouncer (not before cause other middleware can redirect
  // browser before, e.g.: choose-username)
  bouncer.reset(req);

  // client script to use
  var script = (process.env.NODE_ENV !== 'development')
    ? '/build/' + req.locale + '.js'
    : '/' + req.locale + '.js';

  return res.render('chat', {
    meta: {title: i18next.t('title.chat')},
    colors: colors.toString(),
    hello: hello().replace('%u', '<strong>@' + req.user.username + '</strong>'),
    avoidFa: true,
    script: script
  });
});

module.exports = router;
