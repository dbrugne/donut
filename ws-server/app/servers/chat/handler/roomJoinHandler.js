'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
var roomDataHelper = require('../../../util/room-data');
var roomEmitter = require('../../../util/room-emitter');
var Notifications = require('../../../components/notifications');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var room = session.__room__;

  if (!data.room_id && !data.name) {
    return next(null, {code: 400, err: 'params-room-id-name'});
  }
  if (!room) {
    return next(null, {code: 404, err: 'room-not-found'});
  }

  roomDataHelper(user, room, _.bind(function (err, roomData) {
    if (err) {
      return errors.getHandler('room:join', next)(err);
    }

    // @hack to detect particular case for kicked rejoin
    if (roomData.blocked_why === 'kick') {
      roomData.blocked = false;
      delete roomData.blocked_why;
    }

    // @hack to detect particular case for password join
    if (roomData.blocked_why === 'disallow' && room.password && data.password) {
      var isGoodPassword = room.isGoodPassword(user.id, data.password);
      if (isGoodPassword === true) {
        roomData.blocked = false;
        delete roomData.blocked_why;
      } else {
        return next(null, {code: 403, err: isGoodPassword});
      }
    }

    if (roomData.blocked === false) {
      this.join(user, room, roomData, next);
    } else {
      this.blocked(user, room, roomData, next);
    }
  }, this));
};

handler.blocked = function (user, room, roomData, next) {
  var that = this;
  async.waterfall([

    function persistUser (callback) {
      var isUserBlocked = user.isRoomBlocked(room.id);
      if (!isUserBlocked) {
        user.addBlockedRoom(room.id, roomData.blocked_why, '', callback);
      } else {
        return callback(null);
      }
    },

    function sendToUserClients (callback) {
      that.app.globalChannelService.pushMessage('connector', 'room:join', roomData, 'user:' + user.id, {}, function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:join', next)(err);
    }

    return next(null);
  });
};

handler.join = function (user, room, roomData, next) {
  var that = this;
  async.waterfall([

    function persistUser (callback) {
      user.removeBlockedRoom(room.id, callback);
    },

    function persistRoom (callback) {
      room.users.addToSet(user._id);
      room.save(function (err) {
        return callback(err);
      });
    },

    function broadcast (callback) {
      // this step happen BEFORE room subscription to avoid noisy notifications
      var event = {
        user_id: user.id,
        username: user.username,
        avatar: user._avatar(),
        isDevoiced: room.isDevoice(user.id)
      };

      roomEmitter(that.app, user, room, 'room:in', event, callback);
    },

    function joinClients (eventData, callback) {
      // search for all the user sessions (any frontends)
      that.app.statusService.getSidsByUid(user.id, function (err, sids) {
        if (err) {
          return callback(err);
        }
        if (!sids || sids.length < 1) {
          return callback('no connector sessions for current user (probably a problem somewhere)');
        }
        var parallels = [];
        _.each(sids, function (sid) {
          parallels.push(function (fn) {
            that.app.globalChannelService.add(room.id, user.id, sid, function (err) {
              if (err) {
                return fn(sid + ': ' + err);
              }
              return fn(null);
            });
          });
        });
        async.parallel(parallels, function (err) {
          return callback(err, eventData);
        });
      });
    },

    function sendToUserClients (eventData, callback) {
      that.app.globalChannelService.pushMessage('connector', 'room:join', roomData, 'user:' + user.id, {}, function (err) {
        if (err) {
          return callback(err);
        }
        return callback(null, eventData);
      });
    },

    function notification (eventData, callback) {
      Notifications(that.app).getType('roomjoin').create(room, eventData.id, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:join', next)(err);
    }

    return next(null);
  });
};
