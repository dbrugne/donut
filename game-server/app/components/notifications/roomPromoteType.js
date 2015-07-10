var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var async = require('async');
var User = require('../../../../shared/models/user');
var Room = require('../../../../shared/models/room');
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

Notification.prototype.type = 'roompromote';

Notification.prototype.shouldBeCreated = function (type, user, data) {

  var that = this;
  async.waterfall([

    function checkOwn(callback) {
      if (data.event.by_user_id == user._id.toString())
        return callback('no notification due to my own message');
      else
        return callback(null);
    },

    // Avoid sending notification if user does not need it
    function checkPreferences(callback) {
      if (user.preferencesValue('room:notif:nothing:__what__'.replace('__what__', data.room.name)) || !user.preferencesValue('room:notif:roompromote:__what__'.replace('__what__', data.room.name)))
        return callback('no notification due to user preferences');
      else
        return callback(null);
    },

    utils.checkRepetitive(type, user, {
      'data.name': data.room.name,
      'data.by_user_id': data.event.by_user_id
    }, FREQUENCY_LIMITER),

    function checkStatus(callback) {
      that.facade.app.statusService.getStatusByUid(user._id.toString(), function (err, status) {
        if (err)
          return callback('Error while retrieving user status: ' + err);

        return callback(null, status);
      });
    },

    function prepare(status, callback) {

      var model = NotificationModel.getNewModel(type, user, {event: mongoose.Types.ObjectId(data.event.id)});

      model.to_browser = true;
      model.to_email = ( !user.getEmail() ? false : ( status ? false : user.preferencesValue("notif:channels:email")));
      model.to_mobile = (status ? false : user.preferencesValue("notif:channels:mobile"));

      model.save(function (err) {
        if (err)
          return callback(err);

        logger.info('notification created: ' + type + ' for ' + user.username);

        if (!model.sent_to_browser)
          that.sendToBrowser(model);
      });
    }

  ], function (err) {
    if (err)
      return logger.error('Error happened in roomPromoteType|shouldBeCreated : ' + err);
  });
};

Notification.prototype.sendToBrowser = function (model) {

  var userId = model.user.toString();
  var room, byUser;
  var that = this;

  async.waterfall([

    utils.retrieveEvent('historyroom', model.data.event.toString()),

    function manageEvent(event, callback) {
      room = event.room;
      byUser = event.by_user;

      callback(null);
    },

    utils.retrieveUser(userId),

    function prepare(user, callback) {

      var notification = {
        id: model.id,
        time: model.time,
        type: model.type,
        viewed: false,
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
          logger.error('Error while sending notification:new message to user clients: ' + err);

        logger.debug('notification sent: ' + notification);
      });
    }

  ], function (err) {
    if (err)
      return logger.error('Error happened in roomPromoteType|sendToBrowser : ' + err);
  });

};

/**
 * Will send a Notification by Email
 *
 * @param model Notification
 */
Notification.prototype.sendEmail = function (model) {

  var to = model.user.getEmail();
  var from, room;

  if (!model.data || !model.data.event)
    return logger.error('Wrong structure for notification model');

  async.waterfall([

    utils.retrieveEvent('historyroom', model.data.event.toString()),

    function send(event, callback) {
      from = event.by_user.username;
      room = event.room;

      switch (model.type) {

        case 'roomop':
          return emailer.roomOp(to, from, room, callback);
          break;
        case 'roomdeop':
          return emailer.roomDeop(to, from, room, callback);
          break;
        case 'roomkick':
          return emailer.roomKick(to, from, room, callback);
          break;
        case 'roomban':
          return emailer.roomBan(to, from, room, callback);
          break;
        case 'roomdeban':
          return emailer.roomDeban(to, from, room, callback);
          break;
        default:
          return callback('roomPromoteType :: Unknown notification type: ' + model.type);
          break;
      }
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