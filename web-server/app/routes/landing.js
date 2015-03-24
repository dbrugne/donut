var express = require('express');
var router  = express.Router();
var Room = require('../../../shared/models/room');
var i18next = require('../../../shared/util/i18next');
var conf = require('../../../shared/config/index');

router.get('/', [require('csurf')()], function(req, res) {
  var logged = (req.isAuthenticated())
    ? true
    : false;

  var baseUrl = req.protocol + '://' + conf.fqdn + '/';
  var meta = {
    url           : baseUrl,
    title         : i18next.t("title.landing"),
    description   : i18next.t("meta.landing.description"),
    keywords      : i18next.t("meta.landing.keywords"),
    ogtitle       : i18next.t("meta.landing.title"),
    ogdescription : i18next.t("meta.landing.description"),
    image         : baseUrl+"images/donut.jpg",
    type          : 'website'
  };

  return res.render('landing', {
    layout: false,
    partials: {head: '_head', contactform: '_contact', foot: '_foot'},
    token: req.csrfToken(),
    meta: meta,
    logged: logged
  });
});

module.exports = router;