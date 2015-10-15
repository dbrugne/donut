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
  var user = session.__user__;
  var currentUser = session.__currentUser__;
  var group = session.__group__;

  var that = this;

  var rooms = [];
  var event = {};
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

        if (!group.isOwner(currentUser.id) && !group.isOp(currentUser.id) && session.settings.admin !== true) {
          return callback('not-admin-owner');
        }

        if (group.isOwner(user.id)) {
          return callback('owner');
        }

        if (group.isBanned(user.id)) {
          return callback('banned');
        }

        return callback(null);
      },

      function persistOnGroup (callback) {
        var banUser = {
          user: user._id,
          banned_at: new Date()
        };
        if (reason) {
          banUser.reason = reason;
        }

        GroupModel.update(
          {_id: {$in: [group.id]}},
          {
            $addToSet: {bans: banUser},
            $pull: {
              op: user._id,
              members: user._id,
              members_pending: {user: user._id}
            }
          }, function (err) {
            return callback(err, banUser);
          }
        );
      },

      function computeRoomsToProcess (banEvent, callback) {
        RoomModel.findByGroup(group._id)
          .exec(function (err, dbrooms) {
            if (err) {
              return callback(err);
            }
            rooms = dbrooms;
            return callback(err, banEvent);
          });
      },

      function persistOnRooms (banEvent, callback) {
        event = {
          by_user_id: currentUser._id,
          by_username: currentUser.username,
          by_avatar: currentUser._avatar(),
          user_id: user._id,
          username: user.username,
          avatar: user._avatar(),
          banned_at: banEvent.banned_at
        };

        if (reason) {
          event.reason = reason;
        }

        RoomModel.update(
          {group: group._id},
          {
            $pull: {
              users: user._id,
              op: user._id,
              allowed: user._id,
              devoices: {user: user._id},
              allowed_pending: {user: user._id}
            }
          },
          {multi: true},
          function (err) {
            return callback(err, banEvent);
          });
      },

      function broadcast (banEvent, callback) {
        async.each(rooms, function (r, callback) {
          roomEmitter(that.app, user, r, 'room:groupban', _.clone(event), function (err) {
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
        that.app.globalChannelService.pushMessage('connector', 'group:ban', event, 'user:' + user.id, {}, function (reponse) {
          return callback(null);
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

      function notification (event, callback) {
        Notifications(that.app).getType('groupban').create(user.id, group, event, function (err) {
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

handler.deban = function (data, session, next) {
  var user = session.__user__;
  var currentUser = session.__currentUser__;
  var group = session.__group__;

  var that = this;

  var event = {};

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

        if (!group.isOwner(currentUser.id) && !group.isOp(currentUser.id) && session.settings.admin !== true) {
          return callback('not-admin-owner');
        }

        return callback(null);
      },

      function createEvent (callback) {
        if (!group.bans || !group.bans.length) {
          return callback('not-banned');
        }

        if (!group.isBanned(user.id)) {
          return callback('not-banned');
        }

        var subDocument = _.find(group.bans, function (ban) {
          if (ban.user.toString() === user.id) {
            return true;
          }
        });
        group.bans.id(subDocument._id).remove();
        group.save(function (err) {
          return callback(err);
        });
      },

      function broadcast (callback) {
        event = {
          by_user_id: currentUser.id,
          by_username: currentUser.username,
          by_avatar: currentUser._avatar(),
          user_id: user.id,
          username: user.username,
          avatar: user._avatar()
        };

        that.app.globalChannelService.pushMessage('connector', 'group:deban', event, 'user:' + user.id, {}, function (reponse) {
          callback(null);
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