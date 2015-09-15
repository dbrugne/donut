'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var Room = require('../../../../../shared/models/room');
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
  var room = session.__room__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('id is mandatory');
      }

      if (!room) {
        return callback('unable to retrieve room: ' + data.room_id);
      }

      if (room.isBanned(user.id)) {
        return callback('banned');
      }

      if (room.isAllowed(user.id)) {
        return callback('user is allready allowed in room ' + room.name);
      }

      if (room.isAllowedPending(user.id)) {
        return callback('notallowed');
      }

      return callback(null);
    },

    function broadcast (callback) {
      var event = {
        by_user_id: user.id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: room.owner.id,
        username: room.owner.username,
        avatar: room.owner._avatar()
      };

      roomEmitter(that.app, user, room, 'room:request', event, callback);
    },

    function persist (eventData, callback) {
      Room.update(
        {_id: { $in: [room.id] }},
        {$addToSet: {allowed_pending: user._id}}, function (err) {
          return callback(err, eventData);
        }
      );
    },

    function notification (event, callback) {
      Notifications(that.app).getType('roomjoinrequest').create(room.owner, room, event.id, function (err) {
        return callback(err, event);
      });
    }

  ], function (err) {
    if (err) {
      logger.error('[room:join:request] ' + err);

      err = (['banned', 'notallowed'].indexOf(err) !== -1)
        ? err
        : 'internal';
      return next(null, { code: 500, err: err });
    }

    return next(null, {success: true});
  });
};

