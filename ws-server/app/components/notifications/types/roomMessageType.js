var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var common = require('@dbrugne/donut-common');
var _ = require('underscore');
var async = require('async');
var UserModel = require('../../../../../shared/models/user');
var NotificationModel = require('../../../../../shared/models/notification');
var HistoryRoomModel = require('../../../../../shared/models/historyroom');
var emailer = require('../../../../../shared/io/emailer');
var utils = require('./../utils');
var moment = require('../../../../../shared/util/moment');
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

    function avoidRepetitive(roomModel, callback) {
      if (that.facade.options.force === true)
        return callback(null, roomModel);

      var criteria = {
        type: that.type,
        time: {
          $gte: new Date((Date.now() - 1000 * conf.notifications.types.roommessage.creation))
        },
        'data.name': roomModel.name
      };
      NotificationModel.findOne(criteria).count(function (err, count) {
        if (err)
          return callback(err);
        if (count) {
          logger.debug('roomMessageType.create no notification creation due to repetitive');
          return callback(true);
        }

        return callback(null, roomModel);
      });
    },

    utils.retrieveHistoryRoom(history),

    function retrieveUserList(roomModel, historyModel, callback) {
      UserModel.findRoomUsersHavingPreference(roomModel, that.type, historyModel.user.id, function(err, users) {
        if (err)
          return callback(err);
        if (!users.length) {
          logger.debug('roomMessageType.create no notification created: 0 user concerned')
          return callback(true);
        }

        return callback(null, roomModel, historyModel, users);
      });
    },

    function checkStatus(roomModel, historyModel, users, callback) {
      that.facade.app.statusService.getStatusByUids(_.map(users, 'id'), function (err, statuses) {
        if (err)
          return callback('roomMessageType.create error while retrieving user statuses: '+err);

        return callback(null, roomModel, historyModel, users, statuses);
      });
    },

    function prepare(roomModel, historyModel, users, statuses, callback) {
      var notificationsToCreate = [];
      _.each(users, function (user) {
        // online user
        if (statuses[user.id] && that.facade.options.force !== true)
          return;

        var model = NotificationModel.getNewModel(that.type, user, {
          event: historyModel._id,
          name: roomModel.name
        });

        model.to_browser = true; // will be displayed in browser on next connection
        model.to_email = (!user.getEmail() ? false : user.preferencesValue("notif:channels:email"));
        model.to_mobile = user.preferencesValue("notif:channels:mobile");

        if (that.facade.options.force === true) {
          model.to_email = true;
          model.to_mobile = true;
        }

        notificationsToCreate.push(model);
      });

      return callback(null, notificationsToCreate);
    },

    function create(notificationsToCreate, callback) {
      NotificationModel.bulkInsert(notificationsToCreate, function(err, createdNotifications) {
        if (err)
          return callback(err);

        logger.debug('roomMessageType.create '+createdNotifications.length+' notifications created');
        return callback(null);
      });
    }

  ], function(err) {
    if (err && err !== true)
      return done(err);

    return done(null);
  });

};

Notification.prototype.sendEmail = function (model, done) {
  if (!model.data || !model.data.event)
    return logger.error('roomMessageType.sendEmail data.event left');

  async.waterfall([

    function retrieveEvents(callback) {
      HistoryRoomModel.retrieveEventWithContext(model.data.event.toString(), model.user.id, 5, 10, true, function(err, events) {
        if (err)
          return callback(err);

        return callback(null, events);
      });
    },

    function mentions(events, callback) {
      _.each(events, function(event, index, list) {
        if (!event.data.message)
          return;

        list[index].data.message = utils.mentionize(event.data.message, {
          style: 'color: '+conf.room.default.color+';'
        });
      });

      callback(null, events);
    },

    function send(events, callback) {
      var messages = [];
      _.each(events, function (event) {
        var isCurrentMessage = (model.data.event.toString() == event.data.id)
          ? true
          : false;
        messages.push({
          current: isCurrentMessage,
          user_avatar: common.cloudinarySize(event.data.avatar, 90),
          username: event.data.username,
          message: event.data.message,
          time_short: moment(event.data.time).format('Do MMMM, HH:mm'),
          time_full: moment(event.data.time).format('dddd Do MMMM YYYY à HH:mm:ss')
        });
      });

      emailer.roomMessage(model.user.getEmail(), messages, events[0]['data']['name'], common.cloudinarySize(events[0]['data']['room_avatar'], 90), callback);
    },

    function persist(callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], done);
};