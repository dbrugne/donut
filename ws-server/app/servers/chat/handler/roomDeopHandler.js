'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var async = require('async');
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
  var opedUser = session.__user__;
  var room = session.__room__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('id is mandatory');
      }

      if (!data.user_id && !data.username) {
        return callback('require username param');
      }

      if (!room) {
        return callback('unable to retrieve room: ' + data.room_id);
      }

      if (!room.isOwnerOrOp(user.id) && session.settings.admin !== true) {
        return callback('no-op');
      }

      if (!opedUser) {
        return callback('unable to retrieve opedUser: ' + data.username);
      }

      if (!room.isOp(opedUser.id)) {
        return callback('user ' + opedUser.username + ' is not OP of ' + room.name);
      }

      if (!room.isIn(opedUser.id)) {
        return callback('Oped user : ' + opedUser.username + ' is not currently in room ' + room.name);
      }

      return callback(null);
    },

    function persist (callback) {
      room.update({$pull: { op: opedUser._id }}, function (err) {
        return callback(err);
      });
    },

    function broadcast (callback) {
      var event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: opedUser.id,
        username: opedUser.username,
        avatar: opedUser._avatar()
      };

      roomEmitter(that.app, user, room, 'room:deop', event, callback);
    },

    function notification (event, callback) {
      Notifications(that.app).getType('roomdeop').create(opedUser, room, event.id, callback);
    }

  ], function (err) {
    if (err) {
      logger.error('[room:deop] ' + err);

      if (err === 'no-op') {
        return next(null, {code: 403, err: err});
      }
      return next(null, {code: 500, err: 'internal'});
    }

    next(null, {});
  });
};
