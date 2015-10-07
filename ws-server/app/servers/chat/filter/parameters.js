'use strict';
var errors = require('../../../util/errors');
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var async = require('async');
var GroupModel = require('../../../../../shared/models/group');
var RoomModel = require('../../../../../shared/models/room');
var UserModel = require('../../../../../shared/models/user');
var HistoryRoomModel = require('../../../../../shared/models/historyroom');
var HistoryOneModel = require('../../../../../shared/models/historyone');
var common = require('@dbrugne/donut-common/server');

var Filter = function () {
};

module.exports = function () {
  return new Filter();
};

/**
 * Detect expected parameters in 'data', search corresponding models and put in
 * 'session'.
 *
 * Route is available in:  data.__route__ = 'chat.roomHistoryHandler.call'
 *
 * @param data
 * @param session
 * @param next
 * @returns {*}
 */
Filter.prototype.before = function (data, session, next) {
  if (!data) {
    return next();
  }
  async.parallel({
    currentUser: function (callback) {
      var q = UserModel.findOne({ _id: session.uid });

      if (data.__route__ === 'chat.preferencesReadHandler.call') {
        q.populate('bans.user', 'username avatar color facebook');
      }
      q.exec(function (err, user) {
        if (err) {
          return callback(err);
        }
        if (!user) {
          return callback('current-user-not-found');
        }
        return callback(null, user);
      });
    },

    group: function (callback) {
      if (!data.group && !data.group_id) {
        return callback(null);
      }
      if (!data.group_id && data.group &&
        [ 'chat.groupReadHandler.call' ].indexOf(data.__route__) === -1) {
        return callback(null);
      }

      var q;

      if (data.group) {
        if (!common.validate.group(data.group)) {
          return callback('group-name-wrong-format');
        }
        q = GroupModel.findByName(data.group);
      }

      if (data.group_id) {
        if (!common.validate.objectId(data.group_id)) {
          return callback('invalid group_id parameter: ' + data.group_id);
        }
        q = GroupModel.findOne({ _id: data.group_id });
      }

      q.populate('owner', 'username avatar color facebook');
      q.populate('op', 'username avatar color facebook');
      q.populate('members', 'username avatar color facebook');
      q.exec(callback);
    },

    room: function (callback) {
      if (!data.room_id) {
        return callback(null);
      }
      if (!common.validate.objectId(data.room_id)) {
        return callback('params-room-id');
      }

      var q = RoomModel.findOne({ _id: data.room_id })
        .populate('owner', 'username avatar color facebook')
        .populate('group', 'name members');

      q.exec(callback);
    },

    user: function (callback) {
      if (!data.user_id) {
        return callback(null);
      }
      if (!common.validate.objectId(data.user_id)) {
        return callback('params-user-id');
      }
      UserModel.findByUid(data.user_id).exec(callback);
    },

    event: function (callback) {
      if (!data.event) {
        return callback(null);
      }
      if (!common.validate.objectId(data.event)) {
        return callback('params-id');
      }
      switch (data.__route__) {
        case 'chat.userMessageEditHandler.call':
          HistoryOneModel.findOne({ _id: data.event }).exec(callback);
          break;

        case 'chat.roomMessageEditHandler.call':
        case 'chat.roomMessageSpamHandler.call':
        case 'chat.roomMessageUnspamHandler.call':
          HistoryRoomModel.findOne({ _id: data.event }).exec(callback);
          break;

        default:
          return callback(null);
      }
    }

  }, function (err, results) {
    if (err) {
      return errors.getFilterHandler(data.__route__.replace('chat.', ''), next)(err);
    }

    if (results.currentUser) {
      session.__currentUser__ = results.currentUser;
    }
    if (results.room) {
      session.__room__ = results.room;
    }
    if (results.user) {
      session.__user__ = results.user;
    }
    if (results.event) {
      session.__event__ = results.event;
    }
    return next();
  });
};

Filter.prototype.after = function (err, msg, session, resp, next) {
  next(err);
};
