'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var _ = require('underscore');
var async = require('async');
var UserModel = require('../../../../../shared/models/user');
var NotificationModel = require('../../../../../shared/models/notification');
var emailer = require('../../../../../shared/io/emailer');
var utils = require('./../utils');
var conf = require('../../../../../config/index');

module.exports = function (facade) {
  return new Notification(facade);
};

var Notification = function (facade) {
  this.facade = facade;
};

Notification.prototype.create = function (room, history, done) {
  var that = this;
  async.waterfall([

    utils.retrieveRoom(room),

    utils.retrieveHistoryRoom(history),

    function retrieveUserList (roomModel, historyModel, callback) {
      UserModel.findRoomUsersHavingPreference(roomModel, that.type, historyModel.user.id, function (err, users) {
        if (err) {
          return callback(err);
        }
        if (!users.length) {
          logger.debug('roomTopicType.create no notification created: 0 user concerned');
          return callback(true);
        }

        return callback(null, roomModel, historyModel, users);
      });
    },

    function checkStatus (roomModel, historyModel, users, callback) {
      that.facade.app.statusService.getStatusByUids(_.map(users, 'id'), function (err, statuses) {
        if (err) {
          return callback('roomTopicType.create error while retrieving user statuses: ' + err);
        }

        return callback(null, roomModel, historyModel, users, statuses);
      });
    },

    function prepare (roomModel, historyModel, users, statuses, callback) {
      var notificationsToCreate = [];
      _.each(users, function (user) {
        var model = NotificationModel.getNewModel(that.type, user._id, {
          event: historyModel._id,
          name: roomModel.name
        });

        model.to_browser = true;
        model.to_email = (!user.getEmail()
          ? false
          : (statuses[ user.id ]
          ? false
          : user.preferencesValue('notif:channels:email')));
        model.to_mobile = (statuses[ user.id ]
          ? false
          : user.preferencesValue('notif:channels:mobile'));

        if (that.facade.options.force === true) {
          model.to_email = true;
          model.to_mobile = true;
        }

        notificationsToCreate.push(model);
      });

      return callback(null, historyModel, notificationsToCreate);
    },

    function create (historyModel, notificationsToCreate, callback) {
      NotificationModel.bulkInsert(notificationsToCreate, function (err, createdNotifications) {
        if (err) {
          return callback(err);
        }

        logger.debug('roomTopicType.create ' + createdNotifications.length + ' notifications created');
        return callback(null, historyModel, createdNotifications);
      });
    },

    function sendToBrowser (historyModel, createdNotifications, callback) {
      if (!createdNotifications.length) {
        return callback(null);
      }

      async.eachLimit(createdNotifications, 5, function (model, _callback) {
        that.sendToBrowser(model, historyModel, _callback);
      }, callback);
    }

  ], function (err) {
    if (err && err !== true) {
      return done(err);
    }

    return done(null);
  });
};

Notification.prototype.sendToBrowser = function (model, history, done) {
  var event = {
    id: model.id,
    time: model.time,
    type: model.type,
    viewed: false,
    data: {
      user: {
        avatar: history.user._avatar(),
        id: history.user.id,
        username: history.user.username
      },
      room: {
        id: history.room.id,
        name: history.room.name,
        avatar: history.room._avatar()
      },
      topic: history.data.topic
    }
  };
  this.facade.app.globalChannelService.pushMessage('connector', 'notification:new', event, 'user:' + model.user.toString(), {}, done);
};

Notification.prototype.sendEmail = function (model, done) {
  if (!model.data || !model.data.event) {
    return logger.error('roomTopicType.sendEmail data.event left');
  }

  async.waterfall([

    utils.retrieveHistoryRoom(model.data.event.toString()),

    function send (history, callback) {
      var topic = utils.mentionize(history.data.topic, {
        style: 'color: ' + conf.room.default.color + ';'
      });
      if (model.user.getEmail()) {
        emailer.roomTopic(model.user.getEmail(), history.user.username, history.room.name, topic, callback);
      }
    },

    function persist (callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], done);
};
