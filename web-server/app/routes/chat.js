'use strict';
var express = require('express');
var router = express.Router();
var i18next = require('../../../shared/util/i18next');
var bouncer = require('../middlewares/bouncer');
var hello = require('../../../shared/util/hello-dolly');

router.get('/!', function (req, res) {
  // Is user authenticated
  if (!req.isAuthenticated()) {
    // set Flash message (display on profile page or landing page depending
    // requested URL hash)
    req.flash('warning', i18next.t('chat.shouldauthenticated'));

    // render an HTML DOM that redirect browser on corresponding profile page
    return res.render('chat_track_anchor', {
      meta: {title: i18next.t('title.chat')}
    });
  }

  // ... otherwise open chat

  // cleanup bouncer (not before cause other middleware can redirect
  // browser before, e.g.: ex choose-username)
  bouncer.reset(req);

  // client script to use
  var script = (process.env.NODE_ENV !== 'development')
    ? '/build/' + req.locale + '.js'
    : '/' + req.locale + '.js';

  var helloMessage = (req.user.username)
    ? hello().replace('%u', '<strong>@' + req.user.username + '</strong>')
    : hello().replace('%u', '');

  return res.render('chat', {
    meta: {title: i18next.t('title.chat')},
    hello: helloMessage,
    script: script
  });
});

// @hack: https://github.com/dbrugne/donut/issues/1167
router.get('/%21*', function (req, res) {
  // String.replace() by default only replace first occurrence
  res.redirect(req.url.replace('%21', '!'));
});

router.param('group', require('../middlewares/group-param'));
router.get('/g/join/:group', function (req, res) {
  bouncer.set(req, req.group.chat);
  res.redirect('/login');
});

router.param('room', require('../middlewares/room-param'));
var bouncerCallback = function (req, res) {
  bouncer.set(req, req.room.chat);
  res.redirect('/login');
};
router.get('/r/join/:room', bouncerCallback);
router.get('/r/join/:group/:room', bouncerCallback);

module.exports = router;
