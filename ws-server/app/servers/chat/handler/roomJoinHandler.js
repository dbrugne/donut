'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
var roomDataHelper = require('../../../util/roomData');
var roomEmitter = require('../../../util/roomEmitter');
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

  var blocked;

  if (!data.room_id && !data.name) {
    return next(null, {code: 400, err: 'params-room-id-name'});
  }
  if (!room) {
    return next(null, {code: 404, err: 'room-not-found'});
  }

  blocked = room.isUserBlocked(user.id, data.password);
  if (blocked === false) {
    this.join(user, room, next);
  } else {
    this.blocked(user, room, blocked, next);
  }
};

handler.blocked = function (user, room, blocked, next) {
  async.waterfall([
    function (callback) {
      if (blocked === 'groupbanned') {
        return callback(null);
      }

      if (blocked === 'group-members-only') {
        return callback(blocked);
      }

      user.update({ $addToSet: {blocked: room.id} }, function (err) {
        return callback(err);
      });
    },
    function (callback) {
      roomDataHelper(user, room, callback);
    }
  ], function (err, data) {
    if (err) {
      return errors.getHandler('room:join', next)(err);
    }

    return next(null, {code: 403, err: blocked, room: data});
  });
};

handler.join = function (user, room, next) {
  var that = this;
  async.waterfall([
    function broadcast (callback) {
      // this step happen BEFORE user/room persistence and room subscription
      // to avoid noisy notifications
      var event = {
        user_id: user.id,
        username: user.username,
        avatar: user._avatar(),
        isDevoiced: room.isDevoice(user.id)
      };

      roomEmitter(that.app, user, room, 'room:in', event, callback);
    },

    function persistUser (callback) {
      user.update({$pull: {blocked: room._id}}, function (err) {
        return callback(err);
      });
    },

    function persistRoom (eventData, callback) {
      room.lastjoin_at = Date.now();
      room.users.addToSet(user._id);

      // private room only
      if (room.mode === 'private') {
        room.allowed.addToSet(user._id);
        var sub = _.find(room.allowed_pending, function (s) {
          return (s.user.id === user.id);
        });
        if (sub) {
          // @source: http://stackoverflow.com/a/23255415
          room.allowed_pending.id(sub.id).remove();
        }

        //room.update({$pull: {allowed_pending: {user: user._id}}}, function (err) {
        //  return callback(err);
        //});
      }

      room.save(function (err) {
        return callback(err, eventData);
      });
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

    function roomData (eventData, callback) {
      roomDataHelper(user, room, function (err, roomData) {
        if (err) {
          return callback(err);
        }
        return callback(null, eventData, roomData);
      });
    },

    function sendToUserClients (eventData, roomData, callback) {
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
