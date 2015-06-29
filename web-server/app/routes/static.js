var express = require('express');
var router = express.Router();
var i18next = require('../../../shared/util/i18next');

router.get('/eutc', function(req, res) {
  return res.render('eutc', {
    meta: {title: i18next.t("title.static.eutc")}
  });
});

router.get('/legals', function(req, res) {
  return res.render('legals', {
    meta: {title: i18next.t("title.static.legals")}
  });
});

router.get('/faq', function(req, res) {
  return res.render('faq', {
    meta: {title: i18next.t("title.static.faq")}
  });
});


module.exports = router;