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
var conf = require('../../../../config');
var mongoose = require('../../../../shared/io/mongoose');

var FREQUENCY_LIMITER = 0; // 0mn

module.exports = function (facade) {
  return new Notification(facade);
};

var Notification = function (facade) {
  this.facade = facade;
};

Notification.prototype.type = 'usermention';

Notification.prototype.shouldBeCreated = function (type, user, data) {

  var that = this;
  async.waterfall([

    function checkOwn(callback) {
      if (data.event.user_id == user._id.toString()) {
        logger.debug('no notification due to my own message');
        return utils.waterfallDone(null);
      }
      else
        return callback(null);
    },

    function checkPreferences(callback) {
      if (user.preferencesValue('room:notif:nothing:__what__'.replace('__what__', data.room.name)) || !user.preferencesValue('room:notif:__type__:__what__'.replace('__type__', type).replace('__what__', data.room.name))) {
        logger.debug('no notification due to user preferences');
        return utils.waterfallDone(null);
      }
      else
        return callback(null);
    },

    // Do not check repetitive cause we always want to be notified of someone talking about us
    //utils.checkRepetitive(type, user, { 'data.user': data.user }, FREQUENCY_LIMITER),

    function checkStatus(callback) {
      that.facade.app.statusService.getStatusByUid(user._id.toString(), function (err, status) {
        if (err)
          return utils.waterfallDone('Error while retrieving user status: '+err);

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
          return utils.waterfallDone(err);

        logger.info('notification created: ' + type + ' for ' + user.username);

        if (!model.sent_to_browser)
          that.sendToBrowser(model);

        callback(null);
      });
    }

  ], utils.waterfallDone);

};

Notification.prototype.sendToBrowser = function (model) {

  var userId = model.user.toString();

  var byUser, room;
  var that = this;

  async.waterfall([

    utils.retrieveEvent('historyroom', model.data.event.toString()),

    utils.retrieveUser(userId),

    function prepare(event, user, callback) {

      room = event.room;
      byUser = event.user;

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

    function push(notification, callback) {
      that.facade.app.globalChannelService.pushMessage('connector', 'notification:new', notification, 'user:' + userId, {}, function (err) {
        if (err)
          return utils.waterfallDone('Error while sending notification:new message to user clients: ' + err);

        logger.debug('notification sent: ' + notification);

        callback(null);
      });
    }

  ], utils.waterfallDone);

};

Notification.prototype.sendEmail = function (model) {

  var to = model.user.getEmail();

  if (!model.data || !model.data.event)
    return logger.error('Wrong structure for notification model');


  async.waterfall([

    utils.retrieveEvent('historyroom', model.data.event.toString()),

    function retrieveEvents(event, callback) {
      HistoryRoomModel.retrieveEventWithContext(model.data.event.toString(), event.user.id, 5, 10, true, callback);
    },

    function mentionize(events, callback) {
      var reg = /@\[([^\]]+)\]\(user:[^)]+\)/g; // @todo yls from config

      _.each(events, function (event, index, list) {
        if (!event.data.message)
          return;

        list[index].data.message = list[index].data.message.replace(reg, "<strong><a style=\"color:" + conf.room.default.color + ";\"href=\"" + conf.url + "/user/$1\">@$1</a></strong>");
      });

      callback(null, events);
    },

    function prepare(events, callback) {
      var messages = [];
      _.each(events, function (event) {
        messages.push({
          current: (model.data.event.toString() === event.data.id),
          user_avatar: cloudinary.userAvatar(event.data.avatar, 90),
          username: event.data.username,
          message: event.data.message,
          time_short: moment(event.data.time).format('Do MMMM, HH:mm'),
          time_full: moment(event.data.time).format('dddd Do MMMM YYYY à HH:mm:ss')
        });
      });

      return callback(null, messages, events[0]['data']['name'], cloudinary.roomAvatar(events[0]['data']['room_avatar'], 90));
    },

    function send(messages, roomName, roomAvatar, callback) {
      emailer.userMention(to, messages, roomName, roomAvatar, callback);
    },

    function saveOnUser(callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], utils.waterfallDone);

};

Notification.prototype.sendMobile = function () {

};