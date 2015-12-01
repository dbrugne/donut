'use strict';
var _ = require('underscore');
var errors = require('../../../util/errors');
var async = require('async');
var GroupModel = require('../../../../../shared/models/group');
var RoomModel = require('../../../../../shared/models/room');
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
  var targetUser = session.__user__;
  var user = session.__currentUser__;
  var group = session.__group__;

  var that = this;

  var rooms = [];
  var event = {};

  async.waterfall([

    function check (callback) {
      if (!data.group_id) {
        return callback('params-room-id');
      }

      if (!data.user_id) {
        return callback('params-user-id');
      }

      if (!group) {
        return callback('group-not-found');
      }

      if (!targetUser) {
        return callback('user-not-found');
      }

      if (!group.isOwner(user.id) && !group.isOp(user.id) && session.settings.admin !== true) {
        return callback('not-admin-owner');
      }

      if (group.isOwner(targetUser)) {
        return callback('owner');
      }

      if (!group.isAllowed(targetUser.id)) {
        return callback('not-allowed');
      }

      return callback(null);
    },

    function persistOnGroup (callback) {
      GroupModel.update(
        {_id: { $in: [group.id] }},
        {$pull: {allowed: targetUser.id, members: targetUser.id, op: targetUser.id}}, function (err) {
          return callback(err);
        });
    },

    function computeRoomsToProcess (callback) {
      RoomModel.findByGroup(group._id)
        .exec(function (err, dbrooms) {
          if (err) {
            return callback(err);
          }
          rooms = dbrooms;
          return callback(err);
        });
    },

    function persistOnRooms (callback) {
      event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: targetUser.id,
        username: targetUser.username,
        avatar: targetUser._avatar(),
        reason: 'Disallow'
      };

      RoomModel.update(
        {group: group._id, mode: 'private', allow_group_member: true, allowed: {$nin: [targetUser._id]}},
        {
          $pull: {
            users: targetUser._id
          }
        },
        {multi: true},
        function (err) {
          return callback(err);
        });
    },

    function broadcast (callback) {
      async.each(rooms, function (r, callback) {
        if (r.mode === 'private' && r.allow_group_member && !_.contains(r.allowed, targetUser._id)) {
          roomEmitter(that.app, targetUser, r, 'room:groupdisallow', _.clone(event), function (err) {
            if (err) {
              return callback(r.id + ': ' + err);
            }
            return callback(null);
          });
        }
      }, function (err) {
        return callback(err);
      });
      callback(null, event);
    },

    function broadcastToUser (eventData, callback) {
      event.group_id = group.id;
      event.group_name = '#' + group.name;
      that.app.globalChannelService.pushMessage('connector', 'group:disallow', event, 'user:' + targetUser.id, {}, function (reponse) {
        callback(null, eventData);
      });
    },

    function notification (event, callback) {
      if (!group.isMember(user.id)) {
        return callback(null);
      }
      Notifications(that.app).getType('groupdisallow').create(targetUser.id, group, event, function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:disallow', next)(err);
    }

    return next(null, {success: true});
  });
};
