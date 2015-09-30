'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var async = require('async');
var _ = require('underscore');
var Notifications = require('../../../components/notifications');
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
  var bannedUser = session.__user__;
  var room = session.__room__;

  var that = this;

  var event = {};

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('room_id is mandatory');
      }

      if (!data.user_id && !data.username) {
        return callback('user_id or username is mandatory');
      }

      if (!room) {
        return callback('unable to retrieve room: ' + data.room_id);
      }

      if (!room.isOwnerOrOp(user.id) && session.settings.admin !== true) {
        return callback('no-op');
      }

      if (!bannedUser) {
        return callback('unable to retrieve bannedUser: ' + data.username);
      }

      return callback(null);
    },

    function persist (callback) {
      if (!room.bans || !room.bans.length) {
        return callback('there is no user banned from this room');
      }

      if (!room.isBanned(bannedUser.id)) {
        return callback('this user ' + bannedUser.username + ' is not banned from ' + room.name);
      }

      var subDocument = _.find(room.bans, function (ban) {
        if (ban.user.toString() === bannedUser.id) {
          return true;
        }
      });
      room.bans.id(subDocument._id).remove();
      room.save(function (err) {
        return callback(err);
      });
    },

    function persistOnUser (callback) {
      bannedUser.update({
        $pull: {blocked: room.id}
      }, function (err) {
          return callback(err);
        }
      );
    },

    function broadcast (callback) {
      event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: bannedUser.id,
        username: bannedUser.username,
        avatar: bannedUser._avatar()
      };

      roomEmitter(that.app, user, room, 'room:deban', event, callback);
    },

    function broadcastToBannedUser (sentEvent, callback) {
      that.app.globalChannelService.pushMessage('connector', 'room:deban', event, 'user:' + bannedUser.id, {}, function (reponse) {
        callback(null, sentEvent);
      });
    },

    function notification (event, callback) {
      Notifications(that.app).getType('roomdeban').create(bannedUser, room, event.id, callback);
    }

  ], function (err) {
    if (err) {
      logger.error('[room:deban] ' + err);

      if (err === 'no-op') {
        return next(null, {code: 403, err: err});
      }
      return next(null, {code: 500, err: 'internal'});
    }

    next(null, {});
  });
};
