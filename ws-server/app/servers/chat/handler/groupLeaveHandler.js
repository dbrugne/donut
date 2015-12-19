'use strict';
var _ = require('underscore');
var errors = require('../../../util/errors');
var async = require('async');
var GroupModel = require('../../../../../shared/models/group');
var RoomModel = require('../../../../../shared/models/room');
var roomEmitter = require('../../../util/room-emitter');

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
  var rooms_ids = [];

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

      if (!group.isMember(user.id)) {
        return callback('not-member');
      }

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
        users: {$in: [user._id]}
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

      rooms_ids = _.map(rooms, '_id');
      RoomModel.update(
        {_id: {$in: rooms_ids}},
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
        rooms_ids: rooms_ids
      };
      that.app.globalChannelService.pushMessage('connector', 'group:leave', event, 'user:' + user.id, {}, function (err) {
        return callback(err);
      });
    },

    function unsubscribeClients (callback) {
      // search for all the user sessions (any frontends)
      that.app.statusService.getSidsByUid(user.id, function (err, sids) {
        if (err) {
          return callback('Error while retrieving user status: ' + err);
        }

        if (!sids || sids.length < 1) {
          return callback(null, event); // the targeted user could be offline at this time
        }

        var parallels = [];
        _.each(sids, function (sid) {
          _.each(rooms, function (room) {
            parallels.push(function (fn) {
              that.app.globalChannelService.leave(room.name, user.id, sid, function (err) {
                if (err) {
                  return fn(sid + ': ' + err);
                }
                return fn(null);
              });
            });
          });
        });
        async.parallel(parallels, function (err, results) {
          if (err) {
            return callback('Error while unsubscribing user ' + user.id + ' : ' + err);
          }

          return callback(null, event);
        });
      });
    },

  ], function (err) {
    if (err) {
      return errors.getHandler('group:leave', next)(err);
    }

    return next(null, {success: true});
  });
}