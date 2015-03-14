var express = require('express');
var router  = express.Router();
var async = require('async');
var _ = require('underscore');
var conf = require('../../../shared/config/index');
var sm = require('sitemap');
var Room = require('../../../shared/models/room');
var User = require('../../../shared/models/room');

router.get('/sitemap.xml', function(req, res) {

  async.waterfall([

    function initialize(callback) {
      var sitemap = sm.createSitemap({
        hostname: conf.url,
        cacheTime: 600000, // 600 sec - cache purge period
        urls: [
          { url: '/',  changefreq: 'weekly', priority: 0.5 }
        ]
      });
      return callback(null, sitemap);
    },

    function rooms(sitemap, callback) {
      Room.find({}, 'name', function(err, rooms) {
        if (err)
          return callback(err);

        _.each(rooms, function(r) {
          sitemap.add({ url: '/room/'+r.name.toLocaleLowerCase() });
        });

        return callback(null, sitemap);
      });
    },

    function users(sitemap, callback) {
      User.find({ username: {$exists: true, $ne: ''} }, 'username', function(err, users) {
        if (err)
          return callback(err);

        _.each(users, function(u) {
          sitemap.add({ url: '/user/'+u.username.toLocaleLowerCase(),  changefreq: 'daily', priority: 0.6 });
        });

        return callback(null, sitemap);
      });
    }

  ], function(err, sitemap) {
    if (err) {
      console.error(err.stack);
      res.status(500).send('Something broke!');
    }

    sitemap.toXML(function (xml) {
      res.header('Content-Type', 'application/xml');
      res.send(xml);
    });

  });

});

module.exports = router;