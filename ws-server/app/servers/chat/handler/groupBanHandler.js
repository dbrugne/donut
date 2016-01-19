'use strict';
var _ = require('underscore');
var errors = require('../../../util/errors');
var async = require('async');
var GroupModel = require('../../../../../shared/models/group');
var RoomModel = require('../../../../../shared/models/room');
var roomEmitter = require('../../../util/room-emitter');
var Notifications = require('../../../components/notifications');
var inputUtil = require('../../../util/input');
var unsubscriber = require('../../../util/unsubscriber');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var bannedUser = session.__user__;
  var group = session.__group__;

  var that = this;

  var rooms = [];

  var reason = (data.reason) ? inputUtil.filter(data.reason, 512) : '';

  async.waterfall(
    [
      function check (callback) {
        if (!data.group_id) {
          return callback('params-group-id');
        }

        if (!data.user_id) {
          return callback('params-user-id');
        }

        if (!group) {
          return callback('group-not-found');
        }

        if (!group.isOwner(user.id) && !group.isOp(user.id) && session.settings.admin !== true) {
          return callback('not-admin-owner');
        }

        if (group.isOwner(bannedUser.id)) {
          return callback('owner');
        }

        if (group.isBanned(bannedUser.id)) {
          return callback('banned');
        }

        return callback(null);
      },

      function persistOnGroup (callback) {
        var ban = {
          user: bannedUser._id,
          banned_at: new Date(),
          reason: reason
        };
        GroupModel.update({_id: group._id}, {
          $addToSet: {bans: ban},
          $pull: {
            op: bannedUser._id,
            members: bannedUser._id,
            allowed: bannedUser._id,
            members_pending: {user: bannedUser._id}
          }}, function (err) {
            return callback(err);
          });
      },

      function persistOnRooms (callback) {
        var ban = {
          user: bannedUser._id,
          banned_at: new Date()
        };
        RoomModel.update(
          {group: group._id},
          {
            $addToSet: {bans: ban},
            $pull: {
              users: bannedUser._id,
              op: bannedUser._id,
              allowed: bannedUser._id,
              devoices: {user: bannedUser._id},
              allowed_pending: {user: bannedUser._id}
            }
          },
          {multi: true},
          function (err) {
            return callback(err);
          });
      },

      function computeRooms (callback) {
        RoomModel.findByGroup(group._id).exec(function (err, dbrooms) {
          if (err) {
            return callback(err);
          }
          rooms = dbrooms;
          return callback(null);
        });
      },

      function persistOnUser (callback) {
        if (!rooms.length) {
          return callback(null);
        }

        async.each(rooms, function (r, fn) {
          if (!r.isIn(bannedUser.id)) {
            return fn(null);
          }
          bannedUser.addBlockedRoom(r.id, 'groupban', reason, fn);
        }, callback);
      },

      function unsubscribeClients (callback) {
        var roomIds = _.map(rooms, 'id');
        if (!roomIds.length) {
          return callback(null);
        }

        unsubscriber(that.app, bannedUser.id, roomIds, callback);
      },

      function broadcastToUser (callback) {
        async.each(rooms, function (room, cb) {
          // @todo optimise by allowing room:blocked with room_ids array of _id to block
          that.app.globalChannelService.pushMessage('connector', 'room:blocked', {room_id: room.id, why: 'groupban', reason: reason}, 'user:' + bannedUser.id, {}, function (err) {
            return cb(err);
          });
        }, callback);
      },

      function broadcastToRoom (callback) {
        var event = {
          by_user_id: user._id,
          by_username: user.username,
          by_avatar: user._avatar(),
          user_id: bannedUser._id,
          username: bannedUser.username,
          avatar: bannedUser._avatar(),
          reason: reason
        };

        async.each(rooms, function (r, cb) {
          roomEmitter(that.app, user, r, 'room:groupban', _.clone(event), function (err) {
            if (err) {
              return cb(r.id + ': ' + err);
            }
            return cb(null);
          });
        }, function (err) {
          return callback(err, event);
        });
      },

      function notification (event, callback) {
        if (!group.isMember(bannedUser.id)) {
          return callback(null);
        }
        Notifications(that.app).getType('groupban').create(bannedUser.id, group, event, function (err) {
          return callback(err);
        });
      }

    ],
    function (err) {
      if (err) {
        return errors.getHandler('group:ban', next)(err);
      }

      return next(null, {success: true});
    }
  );
};
