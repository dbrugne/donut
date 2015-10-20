'use strict';
var express = require('express');
var router = express.Router();
var i18next = require('../../../shared/util/i18next');
var bouncer = require('../middlewares/bouncer');
var cd = require('../../../shared/util/cloudinary');
var conf = require('../../../config/index');

router.param('group', require('../middlewares/group-param'));

router.get('/g/:group', function (req, res) {
  if (req.query.redirect && req.query.redirect === 'true') {
    bouncer.set(req, req.group.chat);
  }

  var meta = {
    url: req.group.url,
    title: i18next.t('title.profile', {subtitle: req.group.name}),
    description: req.group.disclaimer,
    ogtitle: i18next.t('meta.profile.title', {subtitle: req.group.name}),
    ogdescription: i18next.t('meta.profile.description.group', {name: req.group.name}),
    oglocale: i18next.t('meta.locale'),
    ogalternate: i18next.t('meta.alternate'),
    image: req.group.avatar,
    type: 'object'
  };

  res.render('group_profile', {
    meta: meta,
    subtitle: req.group.name,
    group: req.group,
    color: req.group.color,
    userDefaultAvatar: cd.userAvatar('', conf.room.default.color, false, 50),
    mode: req.group.mode
  });
});

module.exports = router;
