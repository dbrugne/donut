'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var async = require('async');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var roomMultiEmitter = require('../../../util/roomMultiEmitter');
var oneMultiEmitter = require('../../../util/oneMultiEmitter');

/**
 * @todo : replace actual logic for user:on/offline and remove roomMultiEmitter + oneMultiEmitter
 *  - on status change detection retrieve user rooms and onetoones,
 *  - extract full online user list from redis
 *  - deduplicate list
 *  - push message
 *  - on client side handle user:online/offline globally and update discussion accordingly
 */

var GLOBAL_CHANNEL_NAME = 'global';

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
 * - broadcast user:online message to all rooms he is in
 * - broadcast user:offline message to all opened onetoone with hi
 *
 * @param {String} uid unique id for user
 * @param {String} welcome message
 */
DisconnectRemote.prototype.online = function (uid, welcome, globalCallback) {
  var start = Date.now();

  var that = this;

  async.waterfall([

    function persistOnUser (callback) {
      User.update({_id: uid}, {
        'lastonline_at': Date.now(),
        online: true
      }, function (err) {
        if (err)
          return callback('Error while updating user online status: ' + err);

        return callback(null);
      });
    },

    function prepareEvent (callback) {
      return callback(null, {
        user_id: welcome.user.user_id,
        username: welcome.user.username,
        avatar: welcome.user.avatar
      });
    },

    function toRooms (event, callback) {
      if (!welcome.rooms || welcome.rooms.length < 1)
        return callback(null, event);

      var roomsToInform = _.map(welcome.rooms, function (room) {
        return {
          name: room.name,
          id: room.id
        };
      });

      roomMultiEmitter(that.app, roomsToInform, 'user:online', event, function (err) {
        if (err)
          return callback(err);

        logger.trace('inform following rooms: ', roomsToInform);
        return callback(null, event);
      });
    },

    function toOnes (event, callback) {
      if (!welcome.onetoones || welcome.onetoones.length < 1)
        return callback(null, event);

      User.find({onetoones: { $in: [uid] }}, 'username', function (err, ones) {
        if (err)
          return callback('Unable to find onetoones to inform on connection: ' + err);

        var onesToInform = [];
        _.each(ones, function (one) {
          if (!one || !one.username)
            return;

          onesToInform.push({from: uid, to: one._id.toString()});
        });

        if (onesToInform.length < 1)
          return callback(null, event);

        oneMultiEmitter(that.app, onesToInform, 'user:online', event, function (err) {
          if (err)
            return callback(err);

          return callback(null, event);
        });
      });
    }

  ], function (err, event) {
    if (err) {
      logger.error(JSON.stringify({
        route: 'statusRemote.online',
        result: 'fail',
        username: welcome.user.username,
        time: new Date(start)
      }));
    } else {
      logger.debug(JSON.stringify({
        route: 'statusRemote.online',
        result: 'success',
        username: welcome.user.username,
        time: new Date(start),
        timeUsed: (Date.now() - start)
      }));
    }

    return globalCallback(err);
  });

};

/**
 * Determine if user is really disconnected: socket.io connexion in browser could suffer micro-disconnection.
 * The purpose of this proxy method is too wait 2s before declaring the user "offline".
 *
 * Logic:
 * - test if last socket and if yes launch a timeout of 2 seconds
 * - after timeout test if user is really offline or not, if still offline call .offline()
 */
DisconnectRemote.prototype.socketGoesOffline = function (uid, globalCallback) {
  var that = this;

  // test if last socket for this user
  async.waterfall([

    function isLastClient (callback) {
      that.app.statusService.getStatusByUid(uid, function (err, status) {
        return callback(err, !status); // at least an other socket is live for this user or not
      });
    },

    function sendUserOffline (itIsLastClient, callback) {
      if (!itIsLastClient)
        return callback(null); // no-op

      setTimeout(function () {
        // re-test if user is still offline after timeout (!= micro-disconnection)
        that.app.statusService.getStatusByUid(uid, function (err, status) {
          if (err)
            return logger.error('Error while retrieving user status: ' + err);

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
 * - broadcast user:offline message to all rooms he is in
 * - broadcast user:offline message to all opened onetoone with him
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
          if (err)
            return callback('Unable to find user: ' + err, null);

          return callback(null, user);
        });
    },

    function persistOfflineAt (user, callback) {
      user.set('lastoffline_at', Date.now());
      user.set('online', false);
      user.save(function (err) {
        if (err)
          return callback('Error while updating user offliness: ' + err);

        return callback(null, user);
      });
    },

    function determineIfGracefullShutdown (user, callback) {
      // @todo : no-op after user lastoffline_at persistence if gracefull shutdown
      return callback(null, user);
    },

    function prepareEvent (user, callback) {
      return callback(null, user, {
        user_id: user.id,
        username: user.username,
        avatar: user._avatar()
      });
    },

    function emitUserOfflineToRooms (user, event, callback) {
      Room.findByUser(user.id).exec(function (err, rooms) {
        if (err)
          return callback(err);

        var roomsToInform = _.map(rooms, function (room) {
          return {
            name: room.name,
            id: room.id
          };
        });

        if (roomsToInform.length < 1)
          return callback(null, user, event);

        roomMultiEmitter(that.app, roomsToInform, 'user:offline', event, function (err) {
          if (err)
            return callback(err);

          logger.trace('Following rooms informed: ' + roomsToInform.join(', '));
          return callback(null, user, event);
        });
      });
    },

    function emitUserOfflineToOnes (user, event, callback) {
      User.find({onetoones: { $in: [uid] }}, 'username', function (err, ones) {
        if (err)
          return callback('Unable to find onetoones to inform on connection: ' + err);

        var onesToInform = [];
        _.each(ones, function (one) {
          if (!one || !one.username)
            return;

          onesToInform.push({from: uid, to: one._id.toString()});
        });

        if (onesToInform.length < 1)
          return callback(null, user, event);

        oneMultiEmitter(that.app, onesToInform, 'user:offline', event, function (err) {
          if (err)
            return callback(err);

          return callback(null, user);
        });
      });
    },

  ], function (err, user) {
    if (err) {
      logger.error(JSON.stringify({
        route: 'statusRemote.offline',
        result: 'fail',
        username: user.username,
        time: new Date(start)
      }));
    } else {
      logger.debug(JSON.stringify({
        route: 'statusRemote.offline',
        result: 'success',
        username: user.username,
        time: new Date(start),
        timeUsed: (Date.now() - start)
      }));
    }
  });

};
