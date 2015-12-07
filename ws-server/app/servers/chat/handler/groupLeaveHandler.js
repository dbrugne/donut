'use strict';
var _ = require('underscore');
var errors = require('../../../util/errors');
var async = require('async');
var GroupModel = require('../../../../../shared/models/group');
var RoomModel = require('../../../../../shared/models/room');
var roomEmitter = require('../../../util/roomEmitter');

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
  var rooms = {};
  var event = {};

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.group_id) {
        return callback('params-group-id');
      }

      if (!group || group.deleted) {
        return callback('group-not-found');
      }

      return callback(null);
    },

    function persistOnGroup (callback) {
      GroupModel.update(
        {_id: group._id},
        {
          $addToSet: {allowed: user._id},
          $pull: {
            op: user._id,
            members: user._id
          }
        }, function (err) {
          return callback(err);
        }
      );
    },

    function computeRoomsToProcess (callback) {
      RoomModel.find({group: group._id, mode: 'private', allow_group_member: true, user: {$nin: [user._id]}})
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
        user_id: user.id,
        username: user.username,
        avatar: user._avatar(),
        reason: 'out'
      };

      RoomModel.update(
        {group: group._id, mode: 'private', allow_group_member: true, user: {$nin: [user._id]}},
        {
          $pull: {
            users: user._id,
            allowed: user._id
          }
        },
        {multi: true},
        function (err) {
          return callback(err);
        });
    },

    function broadcast (callback) {
      var roomEvent = {};
      async.eachLimit(rooms, 10, function (r, callback) {
        roomEvent = {
          name: r.name,
          id: r.id,
          room_id: r.id,
        };
        that.app.globalChannelService.pushMessage('connector', 'room:leave', _.clone(roomEvent), 'user:' + user.id, {}, function (err) {
          if (err) {
            callback(err);
          }
          roomEmitter(that.app, user, r, 'room:out', _.clone(event), function (err) {
            if (err) {
              return callback(r.id + ': ' + err);
            }
            return callback(null);
          });
        });
      }, function (err) {
        return callback(err);
      });
      callback(null);
    },

    function broadcastToUser (callback) {
      event = {
        group_id: group.id,
        group_name: '#' + group.name
      }
      that.app.globalChannelService.pushMessage('connector', 'group:leave', event, 'user:' + user.id, {}, function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:leave', next)(err);
    }

    return next(null, {success: true});
  });
}