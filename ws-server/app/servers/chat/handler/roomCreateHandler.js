'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var RoomModel = require('../../../../../shared/models/room');
var GroupModel = require('../../../../../shared/models/group');
var conf = require('../../../../../config/index');
var keenio = require('../../../../../shared/io/keenio');
var common = require('@dbrugne/donut-common/server');
var Notifications = require('../../../components/notifications');

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

  async.waterfall([

    function check (callback) {
      if (!data.room_name) {
        return callback('params-name');
      }

      if (!common.validate.name(data.room_name)) {
        return callback('name-wrong-format');
      }

      if (data.room_name === conf.group.default.name) {
        return callback('name-wrong-format');
      }

      if (!data.mode) {
        return callback('params-mode');
      }

      if (!common.validate.mode(data.mode)) {
        return callback('mode-wrong-format');
      }

      if (data.group_id && !group) {
        return callback('group-not-found');
      }

      if (data.group_id && group.isBanned(user.get('id'))) {
        return callback('not-allowed');
      }

      if (data.group_id && !group.isMemberOrOwner(user.get('id')) && session.settings.admin !== true) {
        return callback('not-admin-owner-groupowner');
      }

      if (user.confirmed === false) {
        return callback('not-confirmed');
      }

      return callback(null);
    },

    function checkNameAvailability (callback) {
      // check in groups name
      GroupModel.findByName(data.room_name).exec(function (err, group) {
        if (err) {
          return callback(err);
        } else if (group && !data.group_id) {
          return callback('group-name-already-exist');
        }

        // check in room name in the same group or in the global space if room is global
        var q = RoomModel.findByNameAndGroup(data.room_name, data.group_id);
        q.exec(function (err, room) {
          if (err) {
            return callback(err);
          }
          if (room) {
            return callback('room-already-exist');
          }

          return callback(null);
        });
      });
    },

    function create (callback) {
      var room = RoomModel.getNewRoom();
      room.name = data.room_name;
      room.owner = user.id;
      room.mode = data.mode;
      if (data.group_id) {
        room.group = group.id;
      }
      if (data.mode === 'private') {
        room.allow_user_request = true; // always set this option to true on private room creation
        if (data.group_id) {
          room.allow_user_request = false; // except for rooms inside a group ==> #1326
        }
      }

      room.save(function (err) {
        return callback(err, room);
      });
    },

    function setPreferencesOnOwner (room, callback) {
      user.set('preferences.room:notif:roomjoin:' + room.id, true);
      user.save(function (err) {
        return callback(err, room);
      });
    },

    function tracking (room, callback) {
      var keenEvent = {
        session: {
          id: session.settings.uuid,
          connector: session.frontendId
        },
        user: {
          id: user.id,
          username: user.username,
          admin: (session.settings.admin === true)
        },
        room: {
          name: room.name
        }
      };
      keenio.addEvent('room_creation', keenEvent, function () {
        return callback(null, room);
      });
    },

    function notification (room, callback) {
      if (!group || (group && group.owner.id === user.id)) {
        return callback(null);
      }

      var event = {
        by_user_id: user._id,
        by_username: user.username,
        by_avatar: user._avatar(),
        user_id: group.owner._id,
        username: group.owner.username,
        avatar: group.owner._avatar(),
        room_id: room.id
      };
      Notifications(that.app).getType('roomcreate').create(group.owner.id, room.id, event, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('room:create', next)(err);
    }

    return next(null, {success: true});
  });
};
