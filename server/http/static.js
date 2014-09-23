var express = require('express');
var router = express.Router();
var i18next = require('../app/i18next');

router.get('/eutc', function(req, res) {
  return res.render('eutc', {
    layout: 'layout-static',
    partials: {head: '_head', foot: '_foot'},
    meta: {title: i18next.t("title.static.eutc")}
  });
});

router.get('/legals', function(req, res) {
  return res.render('legals', {
    layout: 'layout-static',
    partials: {head: '_head', foot: '_foot'},
    meta: {title: i18next.t("title.static.legals")}
  });
});

router.get('/faq', function(req, res) {
  return res.render('faq', {
    layout: 'layout-static',
    partials: {head: '_head', foot: '_foot'},
    meta: {title: i18next.t("title.static.faq")}
  });
});


module.exports = router;