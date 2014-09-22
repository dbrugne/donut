var express = require('express');
var router = express.Router();
var i18next = require('../app/i18next');

var paramHandler = require('../app/middlewares/user-param');
router.param('user', paramHandler);

router.get('/user/:user', function(req, res) {
  var meta = {
    url         : req.requestedUser.url,
    description : req.requestedUser.bio,
    title       : i18next.t("meta.profile.title", {subtitle: req.requestedUser.username}),
    image       : req.requestedUser.avatar
  };

  res.render('user_profile', {
    layout: 'layout-profile',
    meta: meta,
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