'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var _ = require('underscore');
var async = require('async');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var roomDataHelper = require('../../../util/roomData');
var oneDataHelper = require('../../../util/oneData');
var featuredRooms = require('../../../../../shared/util/featured-rooms');
var Notifications = require('../../../components/notifications');

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
    blocked: []
  };

  var that = this;

  async.waterfall([

    function retrieveUser (callback) {
      User.findById(uid)
        .populate('ones.user')
        .populate('blocked')
        .exec(function (err, user) {
          if (err || !user) {
            return callback('Unable to find user: ' + err, null);
          }

          welcomeEvent.user = {
            user_id: user._id.toString(),
            username: user.username,
            avatar: user._avatar()
          };

          if (user.admin === true) {
            welcomeEvent.user.admin = true;
          }

          welcomeEvent.preferences = {};
          welcomeEvent.preferences[ 'browser:exitpopin' ] = (typeof user.preferences[ 'browser:exitpopin' ] === 'undefined' || user.preferences[ 'browser:exitpopin' ] === true);
          welcomeEvent.preferences[ 'browser:welcome' ] = (user.preferences && user.preferences[ 'browser:welcome' ] === true);
          welcomeEvent.preferences[ 'browser:sounds' ] = (user.preferences && user.preferences[ 'browser:sounds' ] === true);
          welcomeEvent.preferences[ 'notif:channels:desktop' ] = (user.preferences && user.preferences[ 'notif:channels:desktop' ] === true);

          return callback(null, user);
        });
    },

    function populateOnes (user, callback) {
      if (user.ones.length < 1) {
        return callback(null, user);
      }

      oneDataHelper(that.app, user, user.ones, function (err, ones) {
        if (err) {
          return callback(err, user);
        }

        welcomeEvent.onetoones = ones;
        return callback(null, user);
      });
    },

    function populateRooms (user, callback) {
      Room.findByUser(user.id)
        .populate('owner', 'username avatar color facebook')
        .populate('group', 'name default')
        .exec(function (err, rooms) {
          if (err) {
            return callback(err);
          }

          if (!rooms || !rooms.length) {
            return callback(null, user);
          }

          var parallels = [];
          _.each(rooms, function (room) {
            if (room.isBanned(user.id)) {
              logger.warn('User ' + uid + ' seems to be banned from ' + room.name + ' but still present in rooms.users');
              return;
            }

            parallels.push(function (fn) {
              roomDataHelper(user, room, function (err, r) {
                fn(err, r);
              });
            });
          });

          if (!parallels.length) {
            return callback(null, user);
          }

          async.parallel(parallels, function (err, results) {
            if (err) {
              return callback('Error while populating rooms: ' + err);
            }

            welcomeEvent.rooms = results;
            return callback(null, user);
          });
        });
    },

    function populateBlocked (user, callback) {
      if (!user.blocked || !user.blocked.length) {
        return callback(null, user);
      }

      Room.find({_id: {$in: user.blocked}})
        .populate('owner', 'username avatar color facebook')
        .populate('group', 'name')
        .exec(function (err, rooms) {
          if (err) {
            return callback(err);
          }

          if (!rooms.length) {
            return callback(null, user);
          }

          async.forEach(rooms, function (room, fn) {
            roomDataHelper(user, room, function (err, r) {
              if (err) {
                fn(err);
              }
              welcomeEvent.blocked.push(r);
              fn(null);
            });
          }, function (err) {
            return callback(err, user);
          });
        });
    },

    function featured (user, callback) {
      if (data.device === 'mobile' && !(user.preferences && user.preferences[ 'browser:welcome' ] === true)) {
        return callback(null, user);
      }

      featuredRooms(that.app, function (err, featured) {
        if (err) {
          logger.error('Error while retrieving featured rooms: ' + err);
        }

        welcomeEvent.featured = _.first(featured, 4); // keep only n firsts

        return callback(null, user);
      });
    },

    function notificationsUnread (user, callback) {
      Notifications(that.app).retrieveUserNotificationsUnviewedCount(user.id, function (err, count) {
        if (err) {
          logger.error('Error while retrieving unread notifications: ' + err);
        }

        welcomeEvent.notifications.unread = count || 0;
        return callback(null, user);
      });
    }

  ], function (err, user) {
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
