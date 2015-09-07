'use strict';
var express = require('express');
var _ = require('underscore');
var async = require('async');
var router = express.Router();
var Room = require('../../../shared/models/room');
var i18next = require('../../../shared/util/i18next');
var conf = require('../../../config/index');
var common = require('@dbrugne/donut-common');

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

  var CACHE_NUMBER = 10;
  var rooms = [];

  async.waterfall([

    function fetchRooms (callback) {
      Room.find({
        priority: {$exists: true, $gt: 0},
        visibility: true,
        deleted: {$ne: true}
      }, 'id name avatar color description owner users')
        .sort({priority: 'desc'})
        .populate('owner', 'username')
        .limit(CACHE_NUMBER * 2)
        .exec(function (err, result) {
          if (err) {
            result = [];
          }
          _.each(result, function (room) {
            if (rooms.indexOf(room.name) !== -1) {
              return;
            }
            var data = {
              name: room.name,
              room_id: room.id,
              owner: {},
              avatar: room._avatar(),
              color: room.color,
              description: room.description,
              users: (room.users) ? room.users.length : 0,
              onlines: 0
            };

            var ident = room.name.replace('#', '').toLocaleLowerCase();
            data.url = req.protocol + '://' + conf.fqdn + '/room/' + ident;
            data.chat = req.protocol + '://' + conf.fqdn + '/!#room/' + ident;
            data.join = req.protocol + '://' + conf.fqdn + '/room/join/' + ident;

            if (room.owner) {
              ident = ('' + room.owner.username).toLocaleLowerCase();
              data.owner = {
                user_id: room.owner._id,
                username: room.owner.username,
                url: req.protocol + '://' + conf.fqdn + '/user/' + ident,
                chat: req.protocol + '://' + conf.fqdn + '/!#user/' + ident,
                discuss: req.protocol + '://' + conf.fqdn + '/user/discuss/' + ident
              };
            }
            rooms.push(data);
          });

          return callback(err);
        });
    },

    function populateAvatars (callback) {
      _.each(rooms, function (room) {
        room.avatar = common.cloudinarySize(room.avatar, 135);
      });
      return callback(null);
    }

  ], function (err) {
    if (err) {
      console.error(err.stack);
      res.status(500).send('Something broke!');
    }

    return res.render('landing', {
      token: req.csrfToken(),
      meta: meta,
      logged: logged,
      rooms: rooms,
      title: false,
      search: false
    });
  });
});

module.exports = router;
