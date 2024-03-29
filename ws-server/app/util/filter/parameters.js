'use strict';
var errors = require('../errors');
var async = require('async');
var GroupModel = require('../../../../shared/models/group');
var RoomModel = require('../../../../shared/models/room');
var UserModel = require('../../../../shared/models/user');
var HistoryRoomModel = require('../../../../shared/models/historyroom');
var HistoryOneModel = require('../../../../shared/models/historyone');
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
        q.populate('bans.user', 'username avatar facebook');
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
      if (!data.group_id) {
        return callback(null);
      }
      if (!common.validate.objectId(data.group_id)) {
        return callback('params-group-id');
      }

      // @todo yls : need all this population for each route??
      GroupModel.findOne({ _id: data.group_id })
        .populate('owner', 'username avatar facebook online bio realname location')
        .populate('op', 'username avatar facebook bio realname location')
        .populate('bans.user', 'username avatar facebook')
        .populate('members', 'username avatar facebook bio realname location')
        .exec(callback);
    },

    room: function (callback) {
      if (!data.room_id) {
        return callback(null);
      }
      if (!common.validate.objectId(data.room_id)) {
        return callback('params-room-id');
      }

      RoomModel.findOne({ _id: data.room_id })
        .populate('owner', 'username avatar facebook')
        .populate('group', 'name members bans owner default avatar')
        .exec(callback);
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

      var q;
      switch (data.__route__) {
        case 'chat.userMessageEditHandler.call':
        case 'history.getUserEventHandler.call':
          q = HistoryOneModel.findOne({ _id: data.event });
          break;

        case 'chat.roomMessageEditHandler.call':
        case 'chat.roomMessageSpamHandler.call':
        case 'chat.roomMessageUnspamHandler.call':
        case 'history.getRoomEventHandler.call':
        case 'chat.signalHandler.event':
          q = HistoryRoomModel.findOne({ _id: data.event });
          break;

        default:
          return callback(null);
      }

      if (data.__route__ === 'history.getUserEventHandler.call') {
        q.populate('from', 'realname username avatar facebook')
          .populate('to', 'realname username avatar facebook');
      }
      if (data.__route__ === 'history.getRoomEventHandler.call' ||
        data.__route__ === 'chat.signalHandler.event') {
        q.populate('room', 'name')
          .populate('user', 'realname username avatar facebook')
          .populate('by_user', 'realname username avatar facebook');
      }

      q.exec(callback);
    }
  }, function (err, results) {
    if (err) {
      return errors.getFilterHandler(data.__route__.replace('chat.', ''), next)(err);
    }

    if (results.currentUser) {
      session.__currentUser__ = results.currentUser;
    }
    if (results.group) {
      session.__group__ = results.group;
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
