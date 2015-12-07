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
  var rooms = [];

  var event = {
    user_id: user.id,
    username: user.username,
    avatar: user._avatar(),
    reason: 'out'
  };

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.group_id) {
        return callback('params-group-id');
      }

      if (!group || group.deleted) {
        return callback('group-not-found');
      }

      // @todo spariaud isMember

      return callback(null);
    },

    function persistOnGroup (callback) {
      GroupModel.update(
        {_id: group._id},
        {
          $addToSet: {allowed: user._id}, // like that user will be able to-rejoin further
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
      RoomModel.find({
        group: group._id,
        mode: 'private',
        allow_group_member: true,
        user: {$in: [user._id]}
      }).exec(function (err, dbrooms) {
        if (err) {
          return callback(err);
        }

        rooms = dbrooms;
        return callback(null);
      });
    },

    function persistOnRooms (callback) {
      if (!rooms.length) {
        return callback(null);
      }

      var ids = _.map(rooms, '_id');
      RoomModel.update(
        {_id: {$in: ids}},
        {
          $pull: {
            users: user._id,
            allowed: user._id
          }
        },
        {multi: true},
        function (err) {
          return callback(err);
        }
      );
    },

    function broadcast (callback) {
      if (!rooms.length) {
        return callback(null);
      }

      async.eachLimit(rooms, 5, function (r, cb) {
        roomEmitter(that.app, user, r, 'room:out', _.clone(event), cb);
      }, callback);
    },

    function broadcastToUser (callback) {
      var event = {
        group_id: group.id,
        group_name: '#' + group.name,
        // @todo : add rooms
      };
      // @todo : implement room:leave logic on client side for group:leave
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