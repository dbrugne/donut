'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename);
var _ = require('underscore');
var async = require('async');
var emailer = require('../../../../../shared/io/emailer');
var utils = require('./../utils');
var NotificationModel = require('../../../../../shared/models/notification');

module.exports = function (facade) {
  return new Notification(facade);
};

var Notification = function (facade) {
  this.facade = facade;
};

/**
 * Checks conditions and create roompromote notification
 *
 * @param user (User|String)
 * @param room (Room|String)
 * @param history (HistoryRoom|String)
 * @param done
 */
Notification.prototype.create = function (user, room, history, done) {
  var that = this;
  async.waterfall([

    utils.retrieveUser(user),

    utils.retrieveRoom(room),

    utils.retrieveHistoryRoom(history),

    function checkOwn (userModel, roomModel, historyModel, callback) {
      if (historyModel.by_user.id === userModel.id) {
        logger.debug('roomPromoteType.create no notification due to my own message');
        return callback(true);
      }

      return callback(null, userModel, roomModel, historyModel);
    },

    function checkPreferences (userModel, roomModel, historyModel, callback) {
      if (userModel.preferencesValue('room:notif:nothing:__what__'.replace('__what__', roomModel.name)) ||
        !userModel.preferencesValue('room:notif:roompromote:__what__'.replace('__what__', roomModel.name))) {
        logger.debug('roomPromoteType.create no notification due to user preferences');
        return callback(true);
      }

      return callback(null, userModel, roomModel, historyModel);
    },

    function checkStatus (userModel, roomModel, historyModel, callback) {
      that.facade.app.statusService.getStatusByUid(userModel.id, function (err, status) {
        if (err) {
          return callback(err);
        }

        return callback(null, userModel, roomModel, historyModel, status);
      });
    },

    function save (userModel, roomModel, historyModel, status, callback) {
      var model = NotificationModel.getNewModel(that.type, userModel, { event: historyModel._id });
      model.to_browser = true;
      model.to_email = (!userModel.getEmail()
        ? false
        : (status
        ? false
        : userModel.preferencesValue('notif:channels:email')));
      model.to_mobile = (status
        ? false
        : userModel.preferencesValue('notif:channels:mobile'));

      if (that.facade.options.force === true) {
        model.to_email = true;
        model.to_mobile = true;
      }

      model.save(function (err) {
        if (err) {
          return callback(err);
        }

        logger.info('roomPromoteType.create notification created: ' + that.type + ' for ' + userModel.username);
        that.sendToBrowser(model, userModel, roomModel, historyModel, function () {
          return callback(null);
        });
      });
    }

  ], function (err) {
    if (err && err !== true) {
      return done(err);
    }

    return done(null);
  });
};

Notification.prototype.sendToBrowser = function (model, user, room, history, done) {
  var event = {
    id: model.id,
    time: model.time,
    type: model.type,
    viewed: false,
    data: {
      by_user: {
        avatar: history.by_user._avatar(),
        id: history.by_user.id,
        username: history.by_user.username
      },
      user: {
        avatar: user._avatar(),
        id: user.id,
        username: user.username
      },
      room: {
        id: room.id,
        name: room.name,
        avatar: room._avatar()
      }
    }
  };
  this.facade.app.globalChannelService.pushMessage('connector', 'notification:new', event, 'user:' + user.id, {}, done);
};

Notification.prototype.sendEmail = function (model, done) {
  if (!model.data || !model.data.event) {
    return done('roomPromoteType.sendEmail data.event left');
  }

  async.waterfall([

    utils.retrieveHistoryRoom(model.data.event.toString()),

    function send (history, callback) {
      var method, data;
      switch (model.type) {
        case 'roomop':
          method = emailer.roomOp;
          data = {
            username: history.by_user.username,
            roomname: history.room.name
          };
          break;
        case 'roomdeop':
          method = emailer.roomDeop;
          data = {
            username: history.by_user.username,
            roomname: history.room.name
          };
          break;
        case 'roomkick':
          method = emailer.roomKick;
          data = {
            username: history.by_user.username,
            roomname: history.room.name,
            reason: (history.data && history.data.reason
              ? history.data.reason
              : null)
          };
          break;
        case 'roomban':
          method = emailer.roomBan;
          data = {
            username: history.by_user.username,
            roomname: history.room.name,
            reason: (history.data && history.data.reason
              ? history.data.reason
              : null)
          };
          break;
        case 'roomdeban':
          method = emailer.roomDeban;
          data = {
            username: history.by_user.username,
            roomname: history.room.name
          };
          break;
        case 'roomvoice':
          method = emailer.roomVoice;
          data = {
            username: history.by_user.username,
            roomname: history.room.name,
            reason: (history.data && history.data.reason
              ? history.data.reason
              : null)
          };
          break;
        case 'roomdevoice':
          method = emailer.roomDevoice;
          data = {
            username: history.by_user.username,
            roomname: history.room.name,
            reason: (history.data && history.data.reason
              ? history.data.reason
              : null)
          };
          break;
        case 'roomjoinrequest':
          method = emailer.roomJoinRequest;
          data = {
            username: history.by_user.username,
            roomname: history.room.name
          };
          break;
        default:
          return callback('roomPromoteType.sendEmail unknown notification type: ' + model.type);
      }

      _.bind(method, emailer)(model.user.getEmail(), data, callback);
    },

    function persist (callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], done);
};
