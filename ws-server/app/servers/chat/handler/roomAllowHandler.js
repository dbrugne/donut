'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var Room = require('../../../../../shared/models/room');
var Notifications = require('../../../components/notifications');
var roomEmitter = require('../../../util/roomEmitter');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__user__;
  var currentUser = session.__currentUser__;
  var room = session.__room__;

  var that = this;

  var wasPending = false;

  var event = {};

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('room_id is mandatory');
      }

      if (!data.user_id) {
        return callback('user_id is mandatory');
      }

      if (!room) {
        return callback('unable to retrieve room: ' + data.room_id);
      }

      if (!room.isOwner(currentUser.id)) {
        return callback('User ' + currentUser.username + ' is not owner');
      }

      if (room.isAllowed(user.id)) {
        return callback('user is allready allowed in room ' + room.name);
      }

      if (room.isBanned(user.id)) {
        return callback('User ' + user.username + 'is banned in room: ' + room.name);
      }

      return callback(null);
    },

    function broadcast (callback) {
      wasPending = room.isAllowedPending(user.id);

      event = {
        by_user_id: currentUser.id,
        by_username: currentUser.username,
        by_avatar: currentUser._avatar(),
        user_id: user.id,
        username: user.username,
        avatar: user._avatar()
      };

      roomEmitter(that.app, user, room, 'room:allow', event, callback);
    },

    function broadcastToUser (eventData, callback) {
      if (!data.notification && !wasPending) {
        return callback(null, eventData);
      }

      that.app.globalChannelService.pushMessage('connector', 'room:allow', event, 'user:' + user.id, {}, function (reponse) {
        callback(null, eventData);
      });
    },

    function persist (eventData, callback) {
      Room.update(
        {_id: { $in: [room.id] }},
        {$addToSet: {allowed: user.id, users: user.id}}, function (err) {
          if (wasPending) {
            Room.update(
              {_id: { $in: [room.id] }},
              {$pull: {allowed_pending: user.id}}, function (err) {
                return callback(err, eventData);
              }
            );
          } else {
            return callback(err, eventData);
          }
        }
      );
    },

    function notification (event, callback) {
      if (!data.notification && !wasPending) {
        return callback(null, event);
      }

      Notifications(that.app).getType('roomallowed').create(user.id, room, event.id, function (err) {
        return callback(err, event);
      });
    }

  ], function (err) {
    if (err) {
      logger.error('[room:allow] ' + err);
      return next(null, { code: 500, err: err });
    }

    return next(null, {success: true});
  });
};

handler.refuse = function (data, session, next) {
  var user = session.__user__;
  var currentUser = session.__currentUser__;
  var room = session.__room__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('room_id is mandatory');
      }

      if (!data.user_id) {
        return callback('user_id is mandatory');
      }

      if (!room) {
        return callback('unable to retrieve room: ' + data.room_id);
      }

      if (!room.isOwner(currentUser.id)) {
        return callback('User ' + currentUser.username + ' is not owner');
      }

      if (room.isAllowed(user.id)) {
        return callback('user is allowed in room ' + room.name);
      }

      if (room.isBanned(user.id)) {
        return callback('User ' + user.username + 'is banned in room: ' + room.name);
      }

      if (!room.isAllowedPending(user.id)) {
        return callback('User ' + user.username + 'don\'t have allow pending in room: ' + room.name);
      }

      return callback(null);
    },

    function broadcast (callback) {
      var event = {
        by_user_id: currentUser.id,
        by_username: currentUser.username,
        by_avatar: currentUser._avatar(),
        user_id: user.id,
        username: user.username,
        avatar: user._avatar()
      };

      roomEmitter(that.app, user, room, 'room:refuse', event, callback);
    },

    function persist (eventData, callback) {
      Room.update(
        {_id: { $in: [room.id] }},
        {$pull: {allowed_pending: user.id}}, function (err) {
          return callback(err, eventData);
        }
      );
    },

    function notification (event, callback) {
      Notifications(that.app).getType('roomrefuse').create(user.id, room, event.id, function (err) {
        return callback(err, event);
      });
    }

  ], function (err) {
    if (err) {
      logger.error('[room:refuse] ' + err);
      return next(null, { code: 500, err: 'internal' });
    }

    return next(null, {success: true});
  });
};