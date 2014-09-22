var express = require('express');
var router = express.Router();
var i18next = require('../app/i18next');

var paramHandler = require('../app/middlewares/room-param');
router.param('room', paramHandler);

router.get('/room/:room', function(req, res) {
  var meta = {
    url         : req.room.url,
    description : req.room.description,
    title       : i18next.t("meta.profile.title", {subtitle: req.room.name}),
    image       : req.room.avatar
  };

  res.render('room_profile', {
    layout: 'layout-profile',
    meta: meta,
    subtitle: req.room.name,
    room: req.room,
    poster: req.room.poster,
    color: req.room.color,
    partials: {user: '_user'},
    scripts: [
      {src: '/javascripts/plugins/jquery.linkify.min.js'}
    ]
  });
});

module.exports = router;