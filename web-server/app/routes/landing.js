'use strict';
var express = require('express');
var _ = require('underscore');
var async = require('async');
var router = express.Router();
var i18next = require('../../../shared/util/i18next');
var conf = require('../../../config/index');
var common = require('@dbrugne/donut-common');
var featuredRooms = require('../../../shared/util/featuredRooms');

var underscoreTemplate = require('../../../shared/util/underscoreTemplate');
var renderer = underscoreTemplate.standard({
  defaultVariables: {
    t: i18next.t
  }
});

router.get('/', [require('csurf')()], function (req, res) {
  var logged = req.isAuthenticated();
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
        list[index].avatar = common.cloudinarySize(element.avatar, 135);
        var identifier = element.name.replace('#', '').toLocaleLowerCase();
        list[index].url = req.protocol + '://' + conf.fqdn + '/room/' + identifier;
        list[index].join = (req.user) ?
          req.protocol + '://' + conf.fqdn + '/!#room/' + identifier :
          req.protocol + '://' + conf.fqdn + '/room/join/' + identifier;
        if (element.owner) {
          list[index].owner.url = req.protocol + '://' + conf.fqdn + '/user/' +
            ('' + element.owner.username).toLocaleLowerCase();
        }
      });
      var data = {
        title: false,
        rooms: featured,
        replace: true,
        search: false,
        more: false
      };
      renderer.render('../public/donut/templates/rooms-cards.html', data, callback);
    }

  ], function (err, html) {
    if (err) {
      console.error(err.stack);
      return res.status(500);
    }

    return res.render('landing', {
      token: req.csrfToken(),
      meta: meta,
      logged: logged,
      title: false,
      search: false,
      roomsHtml: html,
      more: false
    });
  });
});

module.exports = router;
