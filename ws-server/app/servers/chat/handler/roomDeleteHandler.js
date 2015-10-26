'use strict';
var errors = require('../../../util/errors');
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var async = require('async');
var GroupModel = require('../../../../../shared/models/group');

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

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('params-room-id');
      }

      if (!room) {
        return callback('room-not-found');
      }

      if (!room.group && !room.isOwner(user.id) && session.settings.admin !== true) {
        return callback('not-admin-owner');
      }

      if (room.permanent === true) {
        return callback('not-allowed');
      }

      return callback(null);
    },

    function checkDefaultAndOwnerGroupRoom (callback) {
      if (!room.group) {
        return callback(null);
      }

      var groupId = (room.group._id) ? room.group._id : room.group;
      GroupModel.findById(groupId).exec(function (err, model) {
        if (err) {
          return callback(err);
        } else if (!model) {
          return callback('group-not-found');
        } else if (model.default && model.default.toString() === room.id) { // Room is the group default room
          return callback('not-allowed');
        }

        if (!model.isOwner(user.id) && !room.isOwner(user.id) && session.settings.admin !== true) {
          return callback('not-admin-owner-groupowner');
        }
        return callback(null);
      });
    },

    function kick (callback) {
      var event = {
        name: room.name,
        id: room.id,
        room_id: room.id,
        reason: 'deleted'
      };
      that.app.globalChannelService.pushMessage('connector', 'room:leave', event, room.name, {}, function (err) {
        if (err) {
          logger.error(err);
        } // not 'return', we delete even if error happen
        return callback(null);
      });
    },

    function destroy (callback) {
      that.app.globalChannelService.destroyChannel(room.name, function (err) {
        if (err) {
          logger.error(err);
        } // not 'return', we continue even if error happen
        return callback(null);
      });
    },

    function persist (callback) {
      room.deleted = true;
      room.save(callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:delete', next)(err);
    }

    next(null, {success: true});
  });
};
