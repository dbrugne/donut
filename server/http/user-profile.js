var express = require('express');
var router = express.Router();
var i18next = require('../app/i18next');

var paramHandler = require('../app/middlewares/user-param');
router.param('user', paramHandler);

router.get('/user/:user', function(req, res) {
  var meta = {
    url         : req.requestedUser.url,
    title       : i18next.t("title.profile", {subtitle: req.requestedUser.username}),
    description : req.requestedUser.bio,
    ogtitle     : i18next.t("meta.profile.title", {subtitle: req.requestedUser.username}),
    image       : req.requestedUser.avatar,
    type        : 'object'
  };

  res.render('user_profile', {
    layout: 'layout-profile',
    partials: {head: '_head', room: '_room'},
    meta: meta,
    subtitle: req.requestedUser.username,
    _user: req.requestedUser,
    poster: req.requestedUser.poster,
    color: req.requestedUser.color,
    scripts: [
      {src: '/javascripts/plugins/jquery.linkify.min.js'}
    ]
  });
});

module.exports = router;