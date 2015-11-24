'use strict';
var express = require('express');
var _ = require('underscore');
var async = require('async');
var router = express.Router();
var i18next = require('../../../shared/util/i18next');
var conf = require('../../../config/index');
var common = require('@dbrugne/donut-common/server');
var featuredRooms = require('../../../shared/util/featured-rooms');
var urls = require('../../../shared/util/url');

var underscoreTemplate = require('../../../shared/util/underscore-template');
var renderer = underscoreTemplate.standard({
  defaultVariables: {
    t: i18next.t
  }
});

router.get('/', [require('csurf')()], function (req, res) {
  var baseUrl = req.protocol + '://' + conf.fqdn + '/';
  var meta = {
    url: baseUrl,
    title: i18next.t('title.landing'),
    description: i18next.t('meta.landing.description'),
    keywords: i18next.t('meta.landing.keywords'),
    ogtitle: i18next.t('meta.landing.title'),
    ogdescription: i18next.t('meta.landing.description'),
    image: baseUrl + 'images/donut.jpg',
    type: 'website'
  };

  return res.render('landing', {
    token: req.csrfToken(),
    meta: meta,
    title: false,
    search: false,
    cardsHtml: renderer.render('../public/web/templates/cards.html')
  });
});

module.exports = router;
