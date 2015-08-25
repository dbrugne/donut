var express = require('express');
var router = express.Router();
var i18next = require('../../../shared/util/i18next');
var bouncer = require('../middlewares/bouncer');
var cd = require('../../../shared/util/cloudinary');
var conf = require('../../../config/index');

router.param('user', require('../middlewares/user-param'));

router.get('/user/:user', function(req, res) {
  if (req.query.redirect && req.query.redirect == 'true')
    bouncer.set(req, '/!#user/'+req.requestedUser.chat);

  var meta = {
    url           : req.requestedUser.url,
    title         : i18next.t("title.profile", {subtitle: req.requestedUser.username}),
    description   : req.requestedUser.bio,
    ogtitle       : i18next.t("meta.profile.title", {subtitle: req.requestedUser.username}),
    ogdescription : i18next.t("meta.profile.description.user", {username: req.requestedUser.username}),
    oglocale      : i18next.t("meta.locale"),
    ogalternate   : i18next.t("meta.alternate"),
    image         : req.requestedUser.avatar,
    type          : 'object'
  };

  res.render('user_profile', {
    meta: meta,
    subtitle: req.requestedUser.username,
    _user: req.requestedUser,
    poster: req.requestedUser.poster,
    color: req.requestedUser.color,
    userDefaultAvatar: cd.userAvatar('', conf.room.default.color, false, 50)
  });
});

router.get('/user/discuss/:user', function(req, res) {

  bouncer.set(req, req.requestedUser.chat);
  return res.redirect('/login');

});

module.exports = router;