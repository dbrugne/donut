'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var common = require('@dbrugne/donut-common/server');
var _ = require('underscore');
var async = require('async');
var utils = require('./../utils');
var emailer = require('../../../../../shared/io/emailer');
var moment = require('../../../../../shared/util/moment');
var conf = require('../../../../../config/index');
var NotificationModel = require('../../../../../shared/models/notification');
var HistoryOneModel = require('../../../../../shared/models/historyone');

module.exports = function (facade) {
  return new Notification(facade);
};

var Notification = function (facade) {
  this.facade = facade;
};

Notification.prototype.create = function (user, history, done) {
  var that = this;
  async.waterfall([

    utils.retrieveUser(user),

    utils.retrieveHistoryOne(history),

    function checkOwn (userModel, historyModel, callback) {
      if (historyModel.from.id === userModel.id) {
        logger.debug('userMessageType.create no notification due to my own message');
        return callback(true);
      }

      return callback(null, userModel, historyModel);
    },

    function checkPreferences (userModel, historyModel, callback) {
      if (!userModel.preferencesValue('notif:usermessage')) {
        logger.debug('userMessageType.create no notification due to user preferences');
        return callback(true);
      }

      return callback(null, userModel, historyModel);
    },

    function avoidRepetitive (userModel, historyModel, callback) {
      if (that.facade.options.force === true) {
        return callback(null, userModel, historyModel);
      }

      var criteria = {
        type: that.type,
        time: {
          $gte: new Date((Date.now() - 1000 * conf.notifications.types.usermessage.creation))
        },
        'data.from': historyModel.from._id
      };
      NotificationModel.findOne(criteria).count(function (err, count) {
        if (err) {
          return callback(err);
        }
        if (count) {
          logger.debug('userMessageType.create no notification creation due to repetitive');
          return callback(true);
        }

        return callback(null, userModel, historyModel);
      });
    },

    function checkStatus (userModel, historyModel, callback) {
      that.facade.uidStatus(userModel.id, function (status) {
        if (status && that.facade.options.force !== true) {
          logger.debug('userMessageType.create no notification due to user status');
          return callback(true);
        }

        return callback(null, userModel, historyModel, status);
      });
    },

    function save (userModel, historyModel, status, callback) {
      var model = NotificationModel.getNewModel(that.type, userModel._id, {
        event: historyModel._id,
        from: historyModel.from // for repetitive
      });
      model.to_browser = false; // will be not displayed in browser on next
                                // connection
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

        logger.debug('userMessageType.create notification created for user ' + userModel.username);
        return callback(null);
      });
    }

  ], function (err) {
    if (err && err !== true) {
      return done(err);
    }

    return done(null);
  });
};

Notification.prototype.sendEmail = function (model, done) {
  if (!model.data || !model.data.event) {
    return logger.error('userMessageType.sendEmail data.event left');
  }

  async.waterfall([

    utils.retrieveHistoryOne(model.data.event.toString()),

    function retrieveEvents (history, callback) {
      HistoryOneModel.retrieveEventWithContext(history.id, 5, 10, true, function (err, events) {
        if (err) {
          return callback(err);
        }

        return callback(null, history, events);
      });
    },

    function mentions (history, events, callback) {
      _.each(events, function (event, index, list) {
        if (!event.data.message) {
          return;
        }

        list[ index ].data.message = utils.mentionize(event.data.message, {
          style: 'color: ' + conf.room.default.color + ';'
        });
      });

      callback(null, history, events);
    },

    function send (history, events, callback) {
      var messages = [];
      _.each(events, function (event) {
        var isCurrentMessage = (history.id === event.data.id);
        messages.push({
          current: isCurrentMessage,
          from_avatar: common.cloudinary.prepare(event.data.from_avatar, 90),
          from_username: event.data.from_username,
          message: event.data.message,
          to_avatar: common.cloudinary.prepare(event.data.to_avatar, 90),
          to_username: event.data.to_username,
          time_short: moment(event.data.time).format('Do MMMM, HH:mm'),
          time_full: moment(event.data.time).format('dddd Do MMMM YYYY à HH:mm:ss')
        });
      });

      emailer.userMessage(model.user.getEmail(), events[ 0 ].data.from_username, messages, callback);
    },

    function persist (callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], done);
};
