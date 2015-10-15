'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var Notifications = require('../../../components/notifications');
var RoomModel = require('../../../../../shared/models/room');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var opedUser = session.__user__;
  var group = session.__group__;

  var event = {};
  var that = this;

  async.waterfall([

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

      if (!group.isOwnerOrOp(user.id) && session.settings.admin !== true) {
        return callback('not-admin-owner');
      }

      if (!opedUser) {
        return callback('user-not-found');
      }

      if (!group.isOp(opedUser.id)) {
        return callback('not-op');
      }

      if (!group.isIn(opedUser.id)) {
        return callback('not-in');
      }

      return callback(null);
    },

    function persist (callback) {
      group.update({$pull: { op: opedUser._id }}, function (err) {
        return callback(err);
      });
    },

    function findDefaultRoom (callback) {
      if (!group.default) {
        return callback('default-room-not-found');
      }

      RoomModel.findOne({ _id: group.default }).exec(function(err, room) {
        if (err) {
          return callback('default-room-not-found');
        }

        return callback(null, room);
      });
    },

    function removeUserFromDefault (room, callback) {
      room.update({$pull: {op: opedUser._id}}, function (err) {
        return callback(err);
      });
    },

    function broadcast (callback) {
      event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: opedUser.id,
        username: opedUser.username,
        avatar: opedUser._avatar(),
        group_id: group.id,
        group_name: '#' + group.name
      };

      that.app.globalChannelService.pushMessage('connector', 'group:deop', event, 'user:' + user.id, {}, function (reponse) {
        return callback(null);
      });
    },

    function notification (callback) {
      Notifications(that.app).getType('groupdeop').create(opedUser.id, group, event, function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:deop', next)(err);
    }

    next(null, {});
  });
};
