'use strict';
var express = require('express');
var router = express.Router();
var i18next = require('../../../shared/util/i18next');
var isMobile = require('ismobilejs');

router.get('/eutc', function (req, res) {
  return res.render('eutc', {
    meta: {title: i18next.t('title.static.eutc')},
    isIphone: isMobile(req.headers['user-agent']).apple.phone,
    isAndroid: isMobile(req.headers['user-agent']).android.phone,
    isWindows: isMobile(req.headers['user-agent']).windows.phone,
    isMobile: isMobile(req.headers['user-agent']).any
  });
});

router.get('/legals', function (req, res) {
  return res.render('legals', {
    meta: {title: i18next.t('title.static.legals')},
    isIphone: isMobile(req.headers['user-agent']).apple.phone,
    isAndroid: isMobile(req.headers['user-agent']).android.phone,
    isWindows: isMobile(req.headers['user-agent']).windows.phone,
    isMobile: isMobile(req.headers['user-agent']).any
  });
});

router.get('/faq', function (req, res) {
  return res.render('faq', {
    meta: {title: i18next.t('title.static.faq')},
    isIphone: isMobile(req.headers['user-agent']).apple.phone,
    isAndroid: isMobile(req.headers['user-agent']).android.phone,
    isWindows: isMobile(req.headers['user-agent']).windows.phone,
    isMobile: isMobile(req.headers['user-agent']).any
  });
});

module.exports = router;
