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
      var data = {
        cards: [],
        title: false,
        fill: true,
        search: false,
        more: false
      };
      _.each(featured, function (card) {
        switch (card.type) {
          case 'user':
            card.avatar = common.cloudinary.prepare(card.avatar, 135);
            card.join = urls(card, 'user', 'chat');
            card.url = urls(card, 'user', 'url');
            break;
          case 'room':
            card.avatar = common.cloudinary.prepare(card.avatar, 135);
            card.join = urls(card, 'room', 'chat');
            card.url = urls(card, 'room', 'url');
            card.owner_url = urls({username: card.owner_username}, 'user', 'chat');
            if (card.group_id) {
              card.group_url = urls(card, 'group', 'uri');
              card.group_avatar = common.cloudinary.prepare(card.group_avatar, 200);
            }
            break;
          case 'group':
            card.avatar = common.cloudinary.prepare(card.avatar, 200);
            card.join = urls(card, 'group', 'chat');
            card.url = urls(card, 'group', 'url');
            card.owner_url = urls({username: card.owner_username}, 'user', 'chat');
            break;
        }
        data.cards.push(card);
      });
      renderer.render('../public/web/templates/cards.html', data, callback);
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
      cardsHtml: html,
      more: false
    });
  });
});

module.exports = router;
