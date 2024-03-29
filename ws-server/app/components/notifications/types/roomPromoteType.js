'use strict';
var logger = require('pomelo-logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var _ = require('underscore');
var async = require('async');
var emailer = require('../../../../../shared/io/emailer');
var utils = require('./../utils');
var HistoryRoom = require('../../../../../shared/models/historyroom');
var RoomModel = require('../../../../../shared/models/room');
var NotificationModel = require('../../../../../shared/models/notification');
var parse = require('../../../../../shared/io/parse');

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
      if (userModel.preferencesValue('room:notif:nothing:__what__'.replace('__what__', roomModel.id)) ||
        !userModel.preferencesValue('room:notif:roompromote:__what__'.replace('__what__', roomModel.id))) {
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
      var model = NotificationModel.getNewModel(that.type, userModel._id, { event: historyModel._id, room: roomModel._id });
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
        name: room.getIdentifier(),
        avatar: room._avatar()
      }
    }
  };
  utils.pushNotification(this.facade.app, event, user.id, done);
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
            roomname: model.data.room.getIdentifier()
          };
          break;
        case 'roomdeop':
          method = emailer.roomDeop;
          data = {
            username: history.by_user.username,
            roomname: model.data.room.getIdentifier()
          };
          break;
        case 'roomkick':
          method = emailer.roomKick;
          data = {
            username: history.by_user.username,
            roomname: model.data.room.getIdentifier(),
            reason: (history.data && history.data.reason
              ? history.data.reason
              : null)
          };
          break;
        case 'roomban':
          method = emailer.roomBan;
          data = {
            username: history.by_user.username,
            roomname: model.data.room.getIdentifier(),
            reason: (history.data && history.data.reason
              ? history.data.reason
              : null)
          };
          break;
        case 'roomdeban':
          method = emailer.roomDeban;
          data = {
            username: history.by_user.username,
            roomname: model.data.room.getIdentifier()
          };
          break;
        case 'roomvoice':
          method = emailer.roomVoice;
          data = {
            username: history.by_user.username,
            roomname: model.data.room.getIdentifier(),
            reason: (history.data && history.data.reason
              ? history.data.reason
              : null)
          };
          break;
        case 'roomdevoice':
          method = emailer.roomDevoice;
          data = {
            username: history.by_user.username,
            roomname: model.data.room.getIdentifier(),
            reason: (history.data && history.data.reason
              ? history.data.reason
              : null)
          };
          break;
        default:
          return callback('roomPromoteType.sendEmail unknown notification type: ' + model.type);
      }

      if (model.user.getEmail()) {
        _.bind(method, emailer)(model.user.getEmail(), data, callback);
      } else {
        callback(null);
      }
    },

    function persist (callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], done);
};

Notification.prototype.sendMobile = function (model, done) {
  if (!model.data || !model.user || !model.user._id) {
    return done('roomPromoteType.sendMobile data left');
  }

  async.waterfall([

    function send (callback) {
      var method;
      if (['roomop', 'roomdeop', 'roomkick', 'roomban', 'roomdeban', 'roomvoice',
          'roomdevoice'].indexOf(model.type) === -1) {
        return callback('roomPromoteType.sendMobile unknown notification type: ' + model.type);
      }
      switch (model.type) {
        case 'roomop':
          method = parse.roomOp;
          break;
        case 'roomdeop':
          method = parse.roomDeop;
          break;
        case 'roomkick':
          method = parse.roomKick;
          break;
        case 'roomban':
          method = parse.roomBan;
          break;
        case 'roomdeban':
          method = parse.roomDeban;
          break;
        case 'roomvoice':
          method = parse.roomVoice;
          break;
        case 'roomdevoice':
          method = parse.roomDevoice;
          break;
      }
      method(model.user._id.toString(), model.data.room.getIdentifier(), model.data.room._avatar(), callback);
    },

    function persist (callback) {
      model.sent_to_mobile = true;
      model.sent_to_mobile_at = new Date();
      model.save(callback);
    }

  ], done);
};

Notification.prototype.populateNotification = function (notification, done) {
  if (!notification || !notification.data || !notification.data.event) {
    return done('roomPromote population error: params');
  }

  HistoryRoom.findOne({_id: notification.data.event.toString()})
    .populate('user', 'username avatar facebook')
    .populate('by_user', 'username avatar facebook')
    .populate('room', 'avatar name group')
    .exec(function (err, event) {
      if (err) {
        return done(err);
      }
      if (!event) {
        return done(null);
      }

      RoomModel.populate(event, {
        path: 'room.group',
        model: 'Group',
        select: 'name'
      }, function (err, docs) {
        if (err) {
          return done(err);
        }

        notification.data.event = docs;
        return done(null, notification);
      });
    });
};
