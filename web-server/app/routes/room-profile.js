var express = require('express');
var router = express.Router();
var i18next = require('../../../shared/util/i18next');
var bouncer = require('../middlewares/bouncer');

router.param('room', require('../middlewares/room-param'));

router.get('/room/:room', function(req, res) {
  if (req.query.redirect && req.query.redirect == 'true')
    bouncer.set(req, req.room.chat);

  var meta = {
    url           : req.room.url,
    title         : i18next.t("title.profile", {subtitle: req.room.name}),
    description   : req.room.description,
    ogtitle       : i18next.t("meta.profile.title", {subtitle: req.room.name}),
    ogdescription : i18next.t("meta.profile.description.room", {name: req.room.name}),
    alternate     : i18next.t("meta.alternate"),
    image         : req.room.avatar,
    type          : 'object'
  };

  res.render('room_profile', {
    layout: 'layout-profile',
    partials: {head: '_head', foot: '_foot', user: '_user'},
    meta: meta,
    subtitle: req.room.name,
    room: req.room,
    poster: req.room.poster,
    color: req.room.color
  });
});

router.get('/room/join/:room', function(req, res) {

  bouncer.set(req, req.room.chat);
  res.redirect('/login');

});

module.exports = router;