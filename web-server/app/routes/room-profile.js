'use strict';
var express = require('express');
var router = express.Router();
var i18next = require('../../../shared/util/i18next');
var bouncer = require('../middlewares/bouncer');
var cd = require('../../../shared/util/cloudinary');
var conf = require('../../../config/index');

var callback = function (req, res) {
  if (req.query.redirect && req.query.redirect === 'true') {
    bouncer.set(req, req.room.chat);
  }

  var meta = {
    url: req.room.url,
    title: i18next.t('title.profile', {subtitle: req.room.name}),
    description: req.room.description,
    ogtitle: i18next.t('meta.profile.title', {subtitle: req.room.name}),
    ogdescription: i18next.t('meta.profile.description.room', {name: req.room.name}),
    oglocale: i18next.t('meta.locale'),
    ogalternate: i18next.t('meta.alternate'),
    image: req.room.avatar,
    type: 'object'
  };

  res.render('room_profile', {
    meta: meta,
    subtitle: req.room.name,
    room: req.room,
    poster: req.room.poster,
    posterBlured: req.room.posterBlured,
    color: req.room.color,
    userDefaultAvatar: cd.userAvatar('', conf.room.default.color, false, 50),
    mode: req.room.mode,
    allow_user_request: req.room.allow_user_request,
    allow_group_member: req.room.allow_group_member
  });
};

var bouncerCallback = function (req, res) {
  bouncer.set(req, req.room.chat);
  res.redirect('/login');
};

router.param('room', require('../middlewares/room-param'));

router.get('/r/join/:room', bouncerCallback);
router.get('/r/join/:group/:room', bouncerCallback);

router.get('/r/:group/:room', callback);
router.get('/r/:room', callback);

module.exports = router;
