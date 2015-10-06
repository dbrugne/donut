'use strict';
var async = require('async');
var _ = require('underscore');
var User = require('../../../shared/models/user');
var Room = require('../../../shared/models/room');
var conf = require('../../../config/index');
var logger = require('pomelo-logger').getLogger('web', __filename);

module.exports = function (req, res, next, username) {
  var data = {};

  async.waterfall([

    function check (callback) {
      if (!username) {
        return callback('404');
      }

      return callback(null);
    },

    function retrieve (callback) {
      User.findByUsername(username).exec(function (err, user) {
        if (err) {
          return callback(err);
        }

        if (!user) {
          return callback('404');
        }

        return callback(null, user);
      });
    },

    function prepare (user, callback) {
      // avatar & poster
      data.id = user.id;
      data.username = user.username;
      data.avatar = user._avatar(160);
      data.poster = user._poster();
      data.color = user.color;
      data.bio = user.bio;
      data.location = user.location;
      data.website = user.website;

      // url
      var ident = ('' + user.username).toLocaleLowerCase();
      data.url = req.protocol + '://' + conf.fqdn + '/user/' + ident;
      data.chat = req.protocol + '://' + conf.fqdn + '/!#user/' + ident;
      data.discuss = req.protocol + '://' + conf.fqdn + '/user/discuss/' + ident;

      return callback(null, user);
    },

    function rooms (user, callback) {
      var q = Room.find({
        $or: [
          {owner: user._id},
          {op: {$in: [user._id]}},
          {users: {$in: [user._id]}}
        ]
      }, 'name owner op avatar color description mode')
        .populate('owner', 'username');
      q.exec(function (err, rooms) {
        if (err) {
          return callback('Error while retrieving rooms for user profile: ' + err);
        }

        if (!rooms || rooms.length < 1) {
          return callback(null, user);
        }

        var list = [];

        _.each(rooms, function (dbroom) {
          var room = dbroom.toJSON();
          if (room.owner) {
            room.owner.url = req.protocol + '://' + conf.fqdn + '/user/' + ('' + room.owner.username).toLocaleLowerCase();
          }

          room.avatar = dbroom._avatar(80);
          room.url = (room.name)
            ? req.protocol + '://' + conf.fqdn + '/room/' + room.name.replace('#', '').toLocaleLowerCase()
            : '';
          room.mode = dbroom.mode;

          list.push(room);
        });

        data.roomsList = list;
        data.hasRooms = true;
        return callback(null, user);
      });
    }

  ], function (err, user) {
    if (err === '404') {
      return res.render('404', {}, function (err, html) {
        if (err) {
          logger.debug(err);
        }
        res.status(404).send(html);
      });
    }

    if (err) {
      req.flash('error', err);
      return res.redirect('/');
    }

    req.requestedUser = data;
    next();
  });
};
