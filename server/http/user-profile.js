var express = require('express');
var router = express.Router();

var paramHandler = require('../app/middlewares/user-param');
router.param('user', paramHandler);

router.get('/user/:user', function(req, res) {
  res.render('user_profile', {
    layout: 'layout-profile',
    subtitle: req.requestedUser.username,
    _user: req.requestedUser,
    poster: req.requestedUser.poster,
    color: req.requestedUser.color,
    partials: {room: '_room'},
    scripts: [
      {src: '/javascripts/plugins/jquery.linkify.min.js'}
    ]
  });
});

module.exports = router;