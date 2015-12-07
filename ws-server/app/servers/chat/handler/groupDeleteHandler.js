'use strict';
var errors = require('../../../util/errors');
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var async = require('async');
var RoomModel = require('../../../../../shared/models/room');
var _ = require('underscore');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var group = session.__group__;

  var that = this;

  var rooms = [];
  async.waterfall([

    function check (callback) {
      if (!data.group_id) {
        return callback('params-group-id');
      }

      if (!group) {
        return callback('group-not-found');
      }

      if (!group.isOwner(user.id) && session.settings.admin !== true) {
        return callback('not-admin-owner');
      }

      if (group.permanent === true) {
        return callback('not-allowed');
      }

      return callback(null);
    },

    function kickRoom (callback) {
      RoomModel.findByGroup(group._id)
        .exec(function (err, dbrooms) {
          if (err) {
            return callback(err);
          }
          rooms = dbrooms;
          async.each(dbrooms, function (room, callback) {
            var event = {
              name: room.name,
              id: room.id,
              room_id: room.id,
              reason: 'deleted'
            };
            that.app.globalChannelService.pushMessage('connector', 'room:leave', event, room.id, {}, function (err) {
              if (err) {
                logger.error(err);
              } // not 'return', we delete even if error happen
              return callback(null);
            });
          }, function (err) {
            return callback(err);
          });
        });
    },

    function kickGroup (callback) {
      var event = {
        group_id: group.id,
        group_name: '#' + group.name,
        by_user_id: user._id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: group.owner._id,
        username: group.owner.username,
        avatar: group.owner._avatar(),
        reason: 'deleted'
      };
      var ids = group.getIdsByType('members');
      var channelsName = [];
      _.each(ids, function (uid) {
        channelsName.push('user:' + uid);
      });
      that.app.globalChannelService.pushMessageToMultipleChannels('connector', 'group:leave', event, channelsName, {}, function (err) {
        return callback(err);
      });
    },

    function persistRooms (callback) {
      var roomIds = _.map(rooms, function (r) {
        return r._id;
      });
      if (!roomIds.length) {
        return callback(null);
      }
      RoomModel.update(
        {_id: {$in: roomIds}},
        {$set: {deleted: true}},
        {multi: true},
        function (err) { callback(err); }
      );
    },

    function persistGroup (callback) {
      group.deleted = true;
      group.save(callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:delete', next)(err);
    }

    next(null, {success: true});
  });
};
