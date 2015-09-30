'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var async = require('async');
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
 * 'session'. Search for: data.name, data.username, data.event and session.uid
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
          return callback('unable to retrieve current user: ' + session.uid);
        }
        return callback(null, user);
      });
    },

    room: function (callback) {
      if (data.__route__ === 'chat.roomCreateHandler.call') {
        return callback(null);
      }
      if (!data.name && !data.room_id) {
        return callback(null);
      }
      if (!data.room_id && data.name && [
        'chat.roomCreateHandler.call',
        'chat.roomJoinHandler.call',
        'chat.roomReadHandler.call' ].indexOf(data.__route__) === -1) {
        return callback(null);
      }

      var q;

      if (data.name) {
        if (!common.validate.name(data.name)) {
          return callback('invalid room name parameter: ' + data.name);
        }
        q = RoomModel.findByName(data.name);
      }

      if (data.room_id) {
        if (!common.validate.objectId(data.room_id)) {
          return callback('invalid room_id parameter: ' + data.room_id);
        }
        q = RoomModel.findOne({ _id: data.room_id });
      }

      if (data.__route__ === 'chat.roomJoinHandler.call') {
        q.populate('owner', 'username avatar color facebook');
      }
      if (data.__route__ === 'chat.roomJoinRequestHandler.call') {
        q.populate('owner', 'username avatar color facebook');
      }
      if (data.__route__ === 'chat.roomReadHandler.call') {
        q.populate('owner', 'username avatar color facebook')
          .populate('op', 'username avatar color facebook')
          .populate('users', 'username avatar color facebook')
          .populate('bans.user', 'username avatar color facebook')
          .populate('devoices.user', 'username avatar color facebook');
      }

      q.exec(callback);
    },

    user: function (callback) {
      if (!data.username && !data.user_id) {
        return callback(null);
      }
      if (!data.user_id && data.username && [
        'chat.roomOpHandler.call',
        'chat.roomDeopHandler.call',
        'chat.roomVoiceHandler.call',
        'chat.roomDevoiceHandler.call',
        'chat.roomKickHandler.call',
        'chat.roomBanHandler.call',
        'chat.roomDebanHandler.call',
        'chat.userBanHandler.call',
        'chat.userDebanHandler.call',
        'chat.userMessageHandler.call',
        'chat.userReadHandler.call',
        'chat.userJoinHandler.call' ].indexOf(data.__route__) === -1) {
        return callback(null);
      }

      if (data.username) {
        if (!common.validate.username(data.username)) {
          return callback('invalid username parameter: ' + data.username);
        }
        UserModel.findByUsername(data.username).exec(callback);
      } else {
        if (!common.validate.objectId(data.user_id)) {
          return callback('invalid user_id parameter: ' + data.user_id);
        }
        UserModel.findByUid(data.user_id).exec(callback);
      }
    },

    event: function (callback) {
      if (!data.event) {
        return callback(null);
      }
      if (!common.validate.objectId(data.event)) {
        return callback('invalid event ID parameter: ' + data.event);
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
      logger.error('[' + data.__route__.replace('chat.', '') + '] ' + err);
      return next(err);
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
