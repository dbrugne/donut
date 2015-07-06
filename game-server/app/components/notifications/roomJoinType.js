var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var cloudinary = require('../../../../shared/cloudinary/cloudinary');
var _ = require('underscore');
var async = require('async');
var User = require('../../../../shared/models/user');
var NotificationModel = require('../../../../shared/models/notification');
var HistoryRoomModel = require('../../../../shared/models/historyroom');
var emailer = require('../../../../shared/io/emailer');
var utils = require('./utils');
var moment = require('../../../../shared/util/moment');

var FREQUENCY_LIMITER = 15; // 15mn

module.exports = function (facade) {
  return new Notification(facade);
};

var Notification = function (facade) {
  this.facade = facade;
};

Notification.prototype.type = 'roomjoin';

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

      var notificationsToCreate = [];

      _.each(users, function (user) {

        var model = NotificationModel.getNewModel(that.type, user, {id: data.event.id});

        model.to_browser = user.preferencesValue("notif:channels:desktop");
        model.to_email = ( !user.getEmail() ? false : ( statuses[user.id] ? false : user.preferencesValue("notif:channels:email")));
        model.to_mobile = (statuses[user.id] ? false : user.preferencesValue("notif:channels:mobile"));

        notificationsToCreate.push(model);
      });

      return callback(null, notificationsToCreate);
    },

    function createNotifications(notificationsToCreate, callback) {
      NotificationModel.bulkInsert(notificationsToCreate, callback);
    },

    function notifyBrowser(notificationsToCreate, callback) {
      _.each(notificationsToCreate, function (notif) {
        if (!notif.sent_to_browser)
          that.sendToBrowser(notif);
      });
    }

  ], function (err) {
    if (err)
      return logger.error('Error happened in roomJoinedType|shouldBeCreated : ' + err);
  });

};

Notification.prototype.sendToBrowser = function (model) {

  var userIdToNotify = model.user.toString();
  var userWhoJoinedRoom, room = null;
  var that = this;

  async.waterfall([

    utils.retrieveEvent('historyroom', model.data.id),

    function prepare(event, callback) {
      room = event.room;
      userWhoJoinedRoom = event.user;

      var notification = {
        id: model.id,
        time: model.time,
        type: model.type,
        viewed: false,
        data: {
          user: {
            avatar: userWhoJoinedRoom._avatar(),
            id: userWhoJoinedRoom.id,
            username: userWhoJoinedRoom.username
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

    utils.retrieveUnreadNotificationsCount(userIdToNotify),

    function push(notification, count, callback) {
      notification.unviewed = count || 0;

      that.facade.app.globalChannelService.pushMessage('connector', 'notification:new', notification, 'user:' + userIdToNotify, {}, function (err) {
        if (err)
          return callback('Error while sending notification:new message to user clients: ' + err);

        logger.debug('notification sent: ' + notification);
      });
    }

  ], function (err) {
    if (err)
      return logger.error('Error happened in roomJoinedType|sendToBrowser : ' + err);
  });

};

Notification.prototype.sendEmail = function (model) {

  var to = model.user.getEmail();

  async.waterfall([

    utils.retrieveEvent('historyroom', model.data.id),

    function send(event, callback) {
      return emailer.roomJoin(to, event.user.username, event.room, callback);
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