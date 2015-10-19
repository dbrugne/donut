'use strict';
var _ = require('underscore');
var errors = require('../../../util/errors');
var async = require('async');
var GroupModel = require('../../../../../shared/models/group');
var RoomModel = require('../../../../../shared/models/room');
var roomEmitter = require('../../../util/roomEmitter');
var Notifications = require('../../../components/notifications');
var inputUtil = require('../../../util/input');

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
  var banUser = {
    user: targetUser._id,
    banned_at: new Date()
  };
  var reason = (data.reason)
    ? inputUtil.filter(data.reason, 512)
    : false;

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

        if (group.isOwner(targetUser.id)) {
          return callback('owner');
        }

        if (group.isBanned(targetUser.id)) {
          return callback('banned');
        }

        return callback(null);
      },

      function persistOnGroup (callback) {
        if (reason) {
          banUser.reason = reason;
        }

        GroupModel.update(
          {_id: group._id},
          {
            $addToSet: {bans: banUser},
            $pull: {
              op: targetUser._id,
              members: targetUser._id,
              members_pending: {user: targetUser._id}
            }
          }, function (err) {
            return callback(err);
          }
        );
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
          by_user_id: user._id,
          by_username: user.username,
          by_avatar: user._avatar(),
          user_id: targetUser._id,
          username: targetUser.username,
          avatar: targetUser._avatar(),
          banned_at: banUser.banned_at
        };

        if (reason) {
          event.reason = reason;
        }

        RoomModel.update(
          {group: group._id},
          {
            $pull: {
              users: targetUser._id,
              op: targetUser._id,
              allowed: targetUser._id,
              devoices: {user: targetUser._id},
              allowed_pending: {user: targetUser._id}
            }
          },
          {multi: true},
          function (err) {
            return callback(err);
          });
      },

      function broadcast (callback) {
        async.each(rooms, function (r, callback) {
          roomEmitter(that.app, targetUser, r, 'room:groupban', _.clone(event), function (err) {
            if (err) {
              return callback(r.id + ': ' + err);
            }
            return callback(null);
          });
        }, function (err) {
          return callback(err);
        });
      },

      function broadcastToUser (callback) {
        event.group_id = group.id;
        event.group_name = '#' + group.name;
        that.app.globalChannelService.pushMessage('connector', 'group:ban', event, 'user:' + targetUser.id, {}, function (reponse) {
          return callback(null);
        });
      },

      function unsubscribeClients (callback) {
        // search for all the user sessions (any frontends)
        that.app.statusService.getSidsByUid(targetUser.id, function (err, sids) {
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
                that.app.globalChannelService.leave(room.name, targetUser.id, sid, function (err) {
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
              return callback('Error while unsubscribing user ' + targetUser.id + ' : ' + err);
            }

            return callback(null, event);
          });
        });
      },

      function notification (event, callback) {
        Notifications(that.app).getType('groupban').create(targetUser.id, group, event, function (err) {
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
