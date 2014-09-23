var express = require('express');
var router = express.Router();
var i18next = require('../app/i18next');

var paramHandler = require('../app/middlewares/room-param');
router.param('room', paramHandler);

router.get('/room/:room', function(req, res) {
  var meta = {
    url         : req.room.url,
    title       : i18next.t("title.profile", {subtitle: req.room.name}),
    description : req.room.description,
    ogtitle     : i18next.t("meta.profile.title", {subtitle: req.room.name}),
    image       : req.room.avatar,
    type        : 'object'
  };

  res.render('room_profile', {
    layout: 'layout-profile',
    partials: {head: '_head', user: '_user'},
    meta: meta,
    subtitle: req.room.name,
    room: req.room,
    poster: req.room.poster,
    color: req.room.color,
    scripts: [
      {src: '/javascripts/plugins/jquery.linkify.min.js'}
    ]
  });
});

module.exports = router;