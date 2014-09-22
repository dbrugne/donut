var express = require('express');
var router  = express.Router();
var Room    = require('../app/models/room');
var i18next = require('../app/i18next');

router.get('/', function(req, res) {
  var logged = (req.isAuthenticated())
    ? true
    : false;

  var baseUrl = req.protocol + '://' + req.get('host') + '/';
  var meta = {
    url         : baseUrl,
    description : i18next.t("meta.landing.description"),
    keywords    : i18next.t("meta.landing.keywords"),
    title       : i18next.t("meta.sitename"),
    image       : baseUrl+"/images/donut.png"
  };

  return res.render('landing', {
    layout: false,
    meta: meta,
    logged: logged
  });
});

module.exports = router;