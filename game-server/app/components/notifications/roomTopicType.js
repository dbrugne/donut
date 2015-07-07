var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var async = require('async');
var User = require('../../../../shared/models/user');
var NotificationModel = require('../../../../shared/models/notification');
var emailer = require('../../../../shared/io/emailer');
var utils = require('./utils');
var mongoose = require('../../../../shared/io/mongoose');

var FREQUENCY_LIMITER = 1; // 1mn

module.exports = function (facade) {
  return new Notification(facade);
};

var Notification = function (facade) {
  this.facade = facade;
};

Notification.prototype.type = 'roomtopic';

Notification.prototype.shouldBeCreated = function (type, room, data) {

  var that = this;
  async.waterfall([

    function retrieveUserList(callback) {
      User.findRoomUsersHavingPreference(room, that.type, data.event.user_id, callback);
    },

    utils.checkRepetitive(type, null, {'data.from_user_id': data.from_user_id}, FREQUENCY_LIMITER),

    function checkStatus(users, callback) {
      that.facade.app.statusService.getStatusByUids(_.map(users, 'id'), function (err, statuses) {
        if (err)
          return callback('Error while retrieving users statuses: ' + err);

        return callback(null, users, statuses);
      });
    },

    function prepare(users, statuses, callback) {
      _.each(users, function (user) {
        var model = NotificationModel.getNewModel(that.type, user, {event: mongoose.Types.ObjectId(data.event.id)});

        model.to_browser = user.preferencesValue("notif:channels:desktop");
        model.to_email = ( !user.getEmail() ? false : ( statuses[user.id] ? false : user.preferencesValue("notif:channels:email")));
        model.to_mobile = (statuses[user.id] ? false : user.preferencesValue("notif:channels:mobile"));

        model.save(function (err) {
          if (err)
            logger.error(err);
          else
            logger.info('notification created: ' + that.type + ' for ' + user.username);
        });

        if (!model.sent_to_browser)
          that.sendToBrowser(model);

      });
    }
  ], function (err, users) {
    if (err)
      return logger.error('Error happened in roomTopicType|shouldBeCreated : ' + err);
  });

};

Notification.prototype.sendToBrowser = function (model) {

  var userId = model.user.toString();
  var room, byUser, eventId;
  var that = this;

  async.waterfall([

    function checkStructure(callback) {
      var err = null;
      if (!model.data || !model.data.event) {
        model.done = true;
        model.save();
        return callback('Wrong structure for notification');
      }

      eventId = model.data.event.toString();
      callback(null);
    },

    utils.retrieveEvent('historyroom', eventId),

    utils.retrieveUser(userId),

    function prepare(event, user, callback) {
      room = event.room;
      byUser = event.user;

      var notification = {
        id: model.id,
        time: model.time,
        type: model.type,
        viewed: false,
        to_browser: user.preferencesValue('notif:channels:desktop'),
        data: {
          by_user: {
            avatar: byUser._avatar(),
            id: byUser.id,
            username: byUser.username
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

      return callback(null, notification);
    },

    utils.retrieveUnreadNotificationsCount(userId),

    function push(notification, count, callback) {
      notification.unviewed = count || 0;

      that.facade.app.globalChannelService.pushMessage('connector', 'notification:new', notification, 'user:' + userId, {}, function (err) {
        if (err)
          return callback('Error while sending notification:new message to user clients: ' + err);

        logger.debug('notification sent: ' + notification);
      });
    }

  ], function (err) {
    if (err)
      return logger.error('Error happened in roomTopicType|sendToBrowser : ' + err);
  });

};

Notification.prototype.sendEmail = function (model) {

  var to = model.user.getEmail();
  var from, room, eventId;

  async.waterfall([

    function checkStructure(callback) {
      var err = null;
      if (!model.data || !model.data.event) {
        model.done = true;
        model.save();
        return callback('Wrong structure for notification');
      }

      eventId = model.data.event.toString();
      callback(null);
    },

    utils.retrieveEvent('historyroom', eventId),

    function send(event, callback) {
      from = event.user.username;
      room = event.room;

      emailer.roomTopic(to, from, room, callback);
    },

    function saveOnUser(callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], function (err) {
    if (err)
      return logger.error('Error happened in roomTopicType|sendEmail : ' + err);
  });

};

Notification.prototype.sendMobile = function () {

};