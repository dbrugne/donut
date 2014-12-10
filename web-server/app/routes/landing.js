var express = require('express');
var router  = express.Router();
var Room = require('../../../shared/models/room');
var i18next = require('../../../shared/util/i18next');

router.get('/', function(req, res) {
  var logged = (req.isAuthenticated())
    ? true
    : false;

  var baseUrl = req.protocol + '://' + req.get('host') + '/';
  var meta = {
    url         : baseUrl,
    title       : i18next.t("title.landing"),
    description : i18next.t("meta.landing.description"),
    keywords    : i18next.t("meta.landing.keywords"),
    ogtitle     : i18next.t("meta.landing.title"),
    image       : baseUrl+"images/donut.jpg",
    type        : 'website'
  };

  return res.render('landing', {
    layout: false,
    partials: {head: '_head', foot: '_foot'},
    meta: meta,
    logged: logged
  });
});

module.exports = router;