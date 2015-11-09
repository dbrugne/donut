'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var _ = require('underscore');
var async = require('async');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');

var TIMEOUT_BEFORE_OFFLINE = 4000; // 4s

module.exports = function (app) {
  return new DisconnectRemote(app);
};

var DisconnectRemote = function (app) {
  this.app = app;
};

/**
 * Handle "this user goes online logic":
 * - update lastonline_at
 * - broadcast user:online message to all rooms users related
 *
 * @param {String} uid unique id for user
 * @param {String} welcome message
 * @param {Function} globalCallback
 */
DisconnectRemote.prototype.online = function (uid, welcome, globalCallback) {
  var start = Date.now();

  var that = this;

  async.waterfall([

    function persistOnUser (callback) {
      User.update({ _id: uid }, {
        'lastonline_at': Date.now(),
        online: true
      }, function (err) {
        if (err) {
          return callback('Error while updating user online status: ' + err);
        }

        return callback(null);
      });
    },

    function broadcast (callback) {
      var roomsId = _.map(welcome.rooms, 'room_id');
      var onesId = _.map(welcome.onetoones, 'user_id');
      var event = {
        user_id: welcome.user.user_id,
        username: welcome.user.username,
        avatar: welcome.user.avatar,
        rooms_id: roomsId
      };

      that.app.globalChannelService.pushMessageToRelatedUsers('connector', roomsId, onesId, 'user:online', event, uid, {}, callback);
    }

  ], function (err) {
    if (err) {
      logger.error('statusRemote.online', {
        result: 'fail',
        username: welcome.user.username
      });
    } else {
      logger.debug('statusRemote.online', {
        result: 'success',
        username: welcome.user.username,
        timeUsed: (Date.now() - start)
      });
    }

    return globalCallback(err);
  });
};

/**
 * Determine if user is really disconnected: socket.io connexion in browser
 * could suffer micro-disconnection. The purpose of this proxy method is too
 * wait 2s before declaring the user "offline".
 *
 * Logic:
 * - test if last socket and if yes launch a timeout of 2 seconds
 * - after timeout test if user is really offline or not, if still offline call
 * .offline()
 */
DisconnectRemote.prototype.socketGoesOffline = function (uid, globalCallback) {
  var that = this;

  // test if last socket for this user
  async.waterfall([

    function isLastClient (callback) {
      that.app.statusService.getStatusByUid(uid, function (err, status) {
        return callback(err, !status); // at least an other socket is live for
                                       // this user or not
      });
    },

    function sendUserOffline (itIsLastClient, callback) {
      if (!itIsLastClient) {
        return callback(null);
      } // no-op

      setTimeout(function () {
        // re-test if user is still offline after timeout (!=
        // micro-disconnection)
        that.app.statusService.getStatusByUid(uid, function (err, status) {
          if (err) {
            return logger.error('Error while retrieving user status: ' + err);
          }

          if (status) {
            logger.trace('socketGoesOffline for ' + uid + ': finally now he is online (micro-disconnection)');
            return; // no-op
          }

          logger.trace('socketGoesOffline for ' + uid + ': finally he is really offline');
          that.offline(uid);
        });
      }, TIMEOUT_BEFORE_OFFLINE);

      // don't wait for response before re-giving hand to entryHandler
      return callback(null);
    }

  ], function (err) {
    return globalCallback(err);
  });
};

/**
 * Handle "this user goes offline logic":
 * - update lastoffline_at
 * - broadcast user:offline message to all users related
 *
 * @param {String} uid unique id for user
 *
 */
DisconnectRemote.prototype.offline = function (uid) {
  var start = Date.now();

  var that = this;

  async.waterfall([

    function retrieveUser (callback) {
      User.findById(uid)
        .exec(function (err, user) {
          if (err || !user) {
            return callback('Unable to find user: ' + err, null);
          }

          return callback(null, user);
        });
    },

    function persistOfflineAt (user, callback) {
      user.set('lastoffline_at', Date.now());
      user.set('online', false);
      user.save(function (err) {
        if (err) {
          return callback('Error while updating user offliness: ' + err);
        }

        return callback(null, user);
      });
    },

    function determineIfGracefullShutdown (user, callback) {
      // @todo dbr : no-op after user lastoffline_at persistence if gracefull
      // shutdown
      return callback(null, user);
    },

    function broadcast (user, callback) {
      Room.findByUser(user.id).exec(function (err, rooms) {
        if (err) {
          return callback(err);
        }

        var roomsId = _.map(rooms, '_id');
        User.find({ 'ones.user': { $in: [ uid ] } }, 'username', function (err, ones) {
          if (err) {
            return callback(err);
          }

          var usersId = _.map(ones, '_id');
          var event = {
            user_id: user.id,
            username: user.username,
            avatar: user._avatar(),
            rooms_id: roomsId
          };
          that.app.globalChannelService.pushMessageToRelatedUsers('connector', roomsId, usersId, 'user:offline', event, uid, {}, callback);
        });
      });
    }

  ], function (err, user) {
    if (err) {
      logger.error('statusRemote.offline', {
        result: 'fail',
        username: (user) ? user.username : 'not found'
      });
    } else {
      logger.debug('statusRemote.offline', {
        result: 'success',
        username: user.username,
        timeUsed: (Date.now() - start)
      });
    }
  });
};
