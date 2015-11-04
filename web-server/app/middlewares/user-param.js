'use strict';
var async = require('async');
var _ = require('underscore');
var User = require('../../../shared/models/user');
var Room = require('../../../shared/models/room');
var logger = require('pomelo-logger').getLogger('web', __filename);
var urls = require('../../../shared/util/url');
var conf = require('../../../config/index');

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
      data.name = user.name;
      data.username = user.username;
      data.avatar = user._avatar(160);
      data.poster = user._poster();
      data.color = user.color;
      data.name = user.name;
      data.bio = user.bio;
      data.location = user.location;
      data.website = user.website;

      var _urls = urls(user, 'user');
      data.url = req.protocol + '://' + conf.fqdn + _urls.url;
      data.chat = _urls.chat;
      data.discuss = _urls.discuss;

      return callback(null, user);
    },

    function rooms (user, callback) {
      var q = Room.find({
        $or: [
          {owner: user._id},
          {op: {$in: [user._id]}},
          {users: {$in: [user._id]}}
        ]
      }, 'name owner op avatar color description mode users group')
        .populate('group', 'name')
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
            room.owner.url = req.protocol + '://' + conf.fqdn + urls(room.owner, 'user', 'url');
          }

          room.avatar = dbroom._avatar(160);
          room.identifier = dbroom.getIdentifier();

          room.mode = dbroom.mode;
          room.users = (dbroom.users)
            ? dbroom.users.length
            : 0;

          if (dbroom.group) {
            room.group_name = dbroom.group.name;
            room.group_id = dbroom.group.id;
          }

          var data = urls(room, 'room');
          room.url = req.protocol + '://' + conf.fqdn + data.url;
          room.chat = data.chat;
          room.join = data.join;

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
