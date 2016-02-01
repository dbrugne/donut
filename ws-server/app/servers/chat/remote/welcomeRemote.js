'use strict';
var logger = require('pomelo-logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var _ = require('underscore');
var async = require('async');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var Group = require('../../../../../shared/models/group');
var roomDataHelper = require('../../../util/room-data');
var oneDataHelper = require('../../../util/one-data');
var featuredRooms = require('../../../../../shared/util/featured-rooms');
var badge = require('../../../../../shared/util/badge');

module.exports = function (app) {
  return new WelcomeRemote(app);
};

var WelcomeRemote = function (app) {
  this.app = app;
};

/**
 * Return the welcome message event for a given user:
 * - user details
 * - rooms where he is in details with short piece of history
 * - opened onetoones  details with short piece of history
 *
 * @param {String} uid unique id for user
 * @param {String} frontendId
 * @param {Function} globalCallback
 */
WelcomeRemote.prototype.getMessage = function (uid, frontendId, data, globalCallback) {
  var start = Date.now();

  var welcomeEvent = {
    notifications: {},
    rooms: []
  };

  var that = this;

  var user;

  async.waterfall([

    function retrieveUser (callback) {
      User.findById(uid)
        .populate('ones.user')
        .exec(function (err, _user) {
          if (err || !_user) {
            return callback('Unable to find user: ' + err, null);
          }

          user = _user;

          welcomeEvent.user = {
            user_id: user._id.toString(),
            username: user.username,
            realname: user.realname,
            confirmed: user.confirmed,
            avatar: user._avatar()
          };

          if (user.admin === true) {
            welcomeEvent.user.admin = true;
          }

          welcomeEvent.preferences = {};
          welcomeEvent.preferences['browser:exitpopin'] = (typeof user.preferences['browser:exitpopin'] === 'undefined' || user.preferences['browser:exitpopin'] === true);
          welcomeEvent.preferences['browser:welcome'] = (user.preferences && user.preferences['browser:welcome'] === true);
          welcomeEvent.preferences['browser:sounds'] = (user.preferences && user.preferences['browser:sounds'] === true);
          welcomeEvent.preferences['notif:channels:desktop'] = (user.preferences && user.preferences['notif:channels:desktop'] === true);
          welcomeEvent.preferences['chatmode:compact'] = (user.preferences && user.preferences['chatmode:compact'] === true);

          return callback(null);
        });
    },

    function populateOnes (callback) {
      if (user.ones.length < 1) {
        return callback(null);
      }

      oneDataHelper(that.app, user, user.ones, function (err, ones) {
        if (err) {
          return callback(err);
        }

        welcomeEvent.onetoones = ones;
        return callback(null);
      });
    },

    function populateRooms (callback) {
      var roomsIds = [];
      Room.findByUser(user.id, '_id').exec(function (err, _rooms) {
        if (err) {
          return callback(err);
        }
        if (_rooms && _rooms.length) {
          roomsIds = _.map(_rooms, 'id');
        }

        if (user.blocked && user.blocked.length) {
          roomsIds = roomsIds.concat(_.map(user.blocked, function (r) {
            return (r.room._id) // robustness
              ? r.room.id
              : r.room;
          }));
        }

        roomsIds = _.uniq(roomsIds);
        if (!roomsIds.length) {
          return callback(null);
        }

        Room.find({_id: {$in: roomsIds}})
          .populate('owner', 'username avatar facebook')
          .populate('group', 'name avatar')
          .exec(function (err, _rooms) {
            if (err) {
              return callback(err);
            }
            if (!_rooms || !_rooms.length) {
              return callback(null);
            }

            async.each(_rooms, function (room, cb) {
              roomDataHelper(user, room, function (err, roomData) {
                welcomeEvent.rooms.push(roomData);
                return cb(err);
              });
            }, callback);
          });
      });
    },

    function populateGroups (callback) {
      if (!user.groups || !user.groups.length) {
        return callback(null);
      }

      Group.find({_id: {$in: user.groups}})
        .populate('owner', 'username avatar')
        .exec(function (err, groups) {
          if (err) {
            return callback(err);
          }

          welcomeEvent.groups = [];
          _.each(groups, function (grp) {
            var group = {
              group_id: grp.id,
              name: grp.name,
              identifier: grp.getIdentifier(),
              avatar: grp._avatar()
            };
            if (grp.bans.length > 0) {
              var u = _.find(grp.bans, function (u) {
                if (u.user.toString() === user.id) {
                  group.blocked = true;
                  group.blocked_reason = u.reason;
                  return true;
                }
              });
            }
            welcomeEvent.groups.push(group);
          });
          return callback(null);
        });
    },

    function featured (callback) {
      if (data.device === 'mobile' && !(user.preferences && user.preferences['browser:welcome'] === true)) {
        return callback(null);
      }

      featuredRooms(that.app, function (err, featured) {
        if (err) {
          logger.error('Error while retrieving featured rooms: ' + err);
        }

        welcomeEvent.featured = _.first(featured, 4); // keep only n firsts

        return callback(null);
      });
    },

    function badgeState (callback) {
      badge(user.id, function (err, discussion, notification, total) {
        if (err) {
          return callback(err);
        }

        welcomeEvent.notifications.unviewed_discussion = discussion;
        welcomeEvent.notifications.unviewed_notification = notification;
        welcomeEvent.notifications.badge = total;

        return callback(null);
      });
    }

  ], function (err) {
    if (err) {
      logger.error('welcomeRemote.welcome', {
        result: 'fail',
        uid: uid,
        frontendId: frontendId
      });
    } else {
      logger.debug('welcomeRemote.welcome', {
        result: 'success',
        username: user.username,
        frontendId: frontendId,
        timeUsed: (Date.now() - start)
      });
    }

    return globalCallback(err, welcomeEvent);
  });
};
