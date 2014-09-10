var express = require('express');
var router = express.Router();

var paramHandler = require('../app/middlewares/room-param');
router.param('room', paramHandler);

router.get('/room/:room', function(req, res) {
  res.render('room_profile', {
    layout: 'layout-profile',
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