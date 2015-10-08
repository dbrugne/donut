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

  async.waterfall([

    function retrieveRooms (callback) {
      featuredRooms(null, callback);
    },

    function renderTemplate (featured, callback) {
      _.each(featured, function (element, index, list) {
        list[index].avatar = common.cloudinary.prepare(element.avatar, 135);
        var data = urls(element, 'room', req.protocol, conf.fqdn);
        list[index].url = data.url;
        list[index].join = (req.user)
          ? data.chat
          : data.join;
        if (element.owner_username) {
          list[index].owner_url = urls({ username: element.owner_username }, 'user', req.protocol, conf.fqdn, 'url');
        }
      });
      var data = {
        title: false,
        rooms: featured,
        replace: true,
        search: false,
        more: false
      };
      renderer.render('../public/web/templates/rooms-cards.html', data, callback);
    }

  ], function (err, html) {
    if (err) {
      console.error(err.stack);
      return res.status(500);
    }

    return res.render('landing', {
      token: req.csrfToken(),
      meta: meta,
      title: false,
      search: false,
      roomsHtml: html,
      more: false
    });
  });
});

module.exports = router;
