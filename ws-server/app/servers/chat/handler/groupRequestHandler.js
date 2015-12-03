'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var Group = require('../../../../../shared/models/group');
var Notifications = require('../../../components/notifications');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.request = function (data, session, next) {
  var user = session.__currentUser__;
  var group = session.__group__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.group_id) {
        return callback('params-group-id');
      }

      if (!group || group.deleted) {
        return callback('group-not-found');
      }

      if (data.message && data.message.length > 200) {
        return callback('message-wrong-format');
      }

      if (group.isMember(user.id)) {
        return callback('already-member');
      }

      if (group.isAllowed(user.id)) {
        return callback('already-allowed');
      }

      if (group.isAllowedPending(user.id)) {
        return callback('allow-pending');
      }

      if (group.isBanned(user.id)) {
        return callback('not-allowed');
      }

      if (user.confirmed === false) {
        return callback('not-confirmed');
      }

      return callback(null);
    },

    function persist (callback) {
      var m = {user: user._id};
      if (data.message) {
        m.message = data.message;
      }
      Group.update(
        {_id: group._id},
        {$addToSet: {members_pending: m}},
        function (err) {
          return callback(err);
        }
      );
    },

    function notification (callback) {
      var event = {
        by_user_id: user._id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: group.owner._id,
        username: group.owner.username,
        avatar: group.owner._avatar()
      };
      var ids = group.getIdsByType('op');
      async.eachLimit(ids, 10, function (id, fn) {
        Notifications(that.app).getType('groupjoinrequest').create(id, group, event, fn);
      }, function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:request:request', next)(err);
    }

    return next(null, {success: true});
  });
};

handler.accept = function (data, session, next) {
  var targetUser = session.__user__;
  var user = session.__currentUser__;
  var group = session.__group__;

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

      if (!group.isOwner(user.id) && !group.isOp(user.id) && session.settings.admin !== true) {
        return callback('not-admin-owner');
      }

      if (group.isMember(targetUser.id)) {
        return callback('already-member');
      }

      if (group.isBanned(targetUser.id)) {
        return callback('group-banned');
      }

      if (!group.isAllowedPending(targetUser.id)) {
        return callback('no-allow-pending');
      }

      return callback(null);
    },

    function persist (callback) {
      Group.update(
        {_id: group._id},
        {
          $addToSet: {members: targetUser.id},
          $pull: {members_pending: {user: targetUser.id}}
        },
        function (err) {
          return callback(err);
        }
      );
    },

    function broadcastToUser (callback) {
      var event = {
        by_user_id: user._id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: targetUser._id,
        username: targetUser.username,
        avatar: targetUser._avatar(),
        color: targetUser.color,
        group_id: group.id,
        pending: group.isAllowedPending(targetUser.id)
      };
      // @todo change to group:refresh and handle on client side
      that.app.globalChannelService.pushMessage('connector', 'group:allow', event, 'user:' + targetUser.id, {}, function (err) {
        callback(err, event);
      });
    },

    function notification (event, callback) {
      Notifications(that.app).getType('groupallowed').create(targetUser.id, group, event, function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:request:accept', next)(err);
    }

    return next(null, {success: true});
  });
};

handler.refuse = function (data, session, next) {
  var targetUser = session.__user__;
  var user = session.__currentUser__;
  var group = session.__group__;

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

      if (!group.isOwner(user.id) && !group.isOp(user.id) && session.settings.admin !== true) {
        return callback('not-admin-owner');
      }

      if (group.isMember(targetUser.id)) {
        return callback('already-member');
      }

      if (!group.isAllowedPending(targetUser.id)) {
        return callback('no-allow-pending');
      }

      return callback(null);
    },

    function persist (callback) {
      Group.update(
        {_id: group._id},
        {$pull: {members_pending: {user: targetUser.id}}},
        function (err) {
          return callback(err);
        }
      );
    },

    function notification (callback) {
      var event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: targetUser.id,
        username: targetUser.username,
        avatar: targetUser._avatar()
      };
      Notifications(that.app).getType('grouprefuse').create(targetUser.id, group, event, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:request:refuse', next)(err);
    }

    return next(null, {success: true});
  });
};

//    function computeRoomsToProcess (callback) {
//      RoomModel.findByGroup(group._id)
//        .exec(function (err, dbrooms) {
//          if (err) {
//            return callback(err);
//          }
//          rooms = dbrooms;
//          return callback(err);
//        });
//    },
//
//    function persistOnRooms (callback) {
//      event = {
//        by_user_id: user.id,
//        by_username: user.username,
//        by_avatar: user._avatar(),
//        user_id: targetUser.id,
//        username: targetUser.username,
//        avatar: targetUser._avatar(),
//        reason: 'Disallow'
//      };
//
//      RoomModel.update(
//        {group: group._id, mode: 'private', allow_group_member: true, allowed: {$nin: [targetUser._id]}},
//        {
//          $pull: {
//            users: targetUser._id
//          }
//        },
//        {multi: true},
//        function (err) {
//          return callback(err);
//        });
//    },
//
//    function broadcast (callback) {
//      async.each(rooms, function (r, callback) {
//        if (r.mode === 'private' && r.allow_group_member && !_.contains(r.allowed, targetUser._id)) {
//          roomEmitter(that.app, targetUser, r, 'room:groupdisallow', _.clone(event), function (err) {
//            if (err) {
//              return callback(r.id + ': ' + err);
//            }
//            return callback(null);
//          });
//        }
//      }, function (err) {
//        return callback(err);
//      });
//      callback(null, event);
//    },
//
//    function broadcastToUser (eventData, callback) {
//      event.group_id = group.id;
//      event.group_name = '#' + group.name;
//      that.app.globalChannelService.pushMessage('connector', 'group:disallow', event, 'user:' + targetUser.id, {}, function (reponse) {
//        callback(null, eventData);
//      });
//    },
//
//    function notification (event, callback) {
//      if (!group.isMember(user.id)) {
//        return callback(null);
//      }
//      Notifications(that.app).getType('groupdisallow').create(targetUser.id, group, event, function (err) {
//        return callback(err);
//      });
//    }
