var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var cloudinary = require('../../../../shared/cloudinary/cloudinary');
var _ = require('underscore');
var async = require('async');
var User = require('../../../../shared/models/user');
var NotificationModel = require('../../../../shared/models/notification');
var emailer = require('../../../../shared/io/emailer');
var utils = require('./utils');
var moment = require('../../../../shared/util/moment');
var mongoose = require('../../../../shared/io/mongoose');

module.exports = function (facade) {
  return new Notification(facade);
};

var Notification = function (facade) {
  this.facade = facade;
};

Notification.prototype.create = function (room, data, done) {
  return done('null'); // @todo dbr

  var that = this;
  async.waterfall([

    function retrieveUserList(callback) {
      User.findRoomUsersHavingPreference(room, that.type, data.event.user_id, callback);
    },

    function checkStatus(users, callback) {
      that.facade.app.statusService.getStatusByUids(_.map(users, 'id'), function (err, statuses) {
        if (err)
          return utils.waterfallDone('Error while retrieving user statuses: '+err);

        return callback(null, users, statuses);
      });
    },

    function prepare(users, statuses, callback) {

      var notificationsToCreate = [];

      _.each(users, function (user) {

        var model = NotificationModel.getNewModel(that.type, user, {event: mongoose.Types.ObjectId(data.event.id)});

        model.to_browser = true;
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

      callback(null);
    }

  ], function(err) {
    if (err && err !== true)
      return done(err);

    return done(null);
  });

};

Notification.prototype.sendToBrowser = function (model, done) {

  var userIdToNotify = model.user.toString();
  var userWhoJoinedRoom, room;
  var that = this;

  async.waterfall([

    utils.retrieveEvent('historyroom', model.data.event.toString()),

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

    function push(notification, callback) {
      that.facade.app.globalChannelService.pushMessage('connector', 'notification:new', notification, 'user:' + userIdToNotify, {}, function (err) {
        if (err)
          return utils.waterfallDone('Error while sending notification:new message to user clients: '+err);

        logger.debug('notification sent: ' + notification);

        callback(null);
      });
    }

  ], done);

};

Notification.prototype.sendEmail = function (model, done) {
  return done('null'); // @todo dbr

  async.waterfall([

    utils.retrieveEvent('historyroom', model.data.event.toString()),

    function send(event, callback) {
      return emailer.roomJoin(model.user.getEmail(), event.user.username, event.room, callback);
    },

    function saveOnUser(callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], done);

};