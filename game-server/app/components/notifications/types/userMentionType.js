var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var cloudinary = require('../../../../../shared/cloudinary/cloudinary');
var _ = require('underscore');
var async = require('async');
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

Notification.prototype.create = function (user, room, history, done) {

  var that = this;
  async.waterfall([

    utils.retrieveUser(user),

    utils.retrieveRoom(room),

    utils.retrieveHistoryRoom(history),

    function checkOwn(userModel, roomModel, historyModel, callback) {
      if (historyModel.user.id == userModel.id) {
        logger.debug('userMentionType.create no notification due to my own message');
        return callback(true);
      }

      return callback(null, userModel, roomModel, historyModel);
    },

    function checkPreferences(userModel, roomModel, historyModel, callback) {
      var key1 = 'room:notif:nothing:__what__'.replace('__what__', roomModel.name);
      var key2 = 'room:notif:__type__:__what__'.replace('__type__', that.type).replace('__what__', roomModel.name);
      if (userModel.preferencesValue(key1) || !userModel.preferencesValue(key2)) {
        logger.debug('userMentionType.create no notification due to user preferences');
        return callback(true);
      }

      return callback(null, userModel, roomModel, historyModel);
    },

    function checkStatus(userModel, roomModel, historyModel, callback) {
      that.facade.app.statusService.getStatusByUid(userModel.id, function (err, status) {
        if (err)
          return callback(err);

        return callback(null, userModel, roomModel, historyModel, status);
      });
    },

    function save(userModel, roomModel, historyModel, status, callback) {
      var model = NotificationModel.getNewModel(that.type, userModel, {
        event: historyModel._id
      });
      model.to_browser = true;
      model.to_email = (!userModel.getEmail() ? false : (status ? false : userModel.preferencesValue("notif:channels:email")));
      model.to_mobile = (status ? false : userModel.preferencesValue("notif:channels:mobile"));
      model.save(function (err) {
        if (err)
          return callback(err);

        logger.info('userMentionType.create notification created: ' + that.type + ' for ' + userModel.username);

        that.sendToBrowser(model, userModel, roomModel, historyModel, callback);
      });
    }

  ], function(err) {
    if (err && err !== true)
      return done(err);

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
  if (!model.data || !model.data.event)
    return done('roomPromoteType.sendEmail data.event left');

  async.waterfall([

    function retrieveEvents(callback) {
      HistoryRoomModel.retrieveEventWithContext(model.data.event.toString(), model.user.id, 5, 10, true, function(err, events) {
        if (err)
          return callback(err);

        return callback(null, events);
      });
    },

    function mentionize(events, callback) {
      var reg = /@\[([^\]]+)\]\(user:[^)]+\)/g; // @todo dbr bundle mentionnize, linkify... other messages transfomrmation in a common class loadable in npm and bower
      _.each(events, function (event, index, list) {
        if (!event.data.message)
          return;

        list[index].data.message = list[index].data.message.replace(reg, "<strong><a style=\"color:" + conf.room.default.color + ";\"href=\"" + conf.url + "/user/$1\">@$1</a></strong>");
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
          user_avatar: cloudinary.userAvatar(event.data.avatar, 90),
          username: event.data.username,
          message: event.data.message,
          time_short: moment(event.data.time).format('Do MMMM, HH:mm'),
          time_full: moment(event.data.time).format('dddd Do MMMM YYYY à HH:mm:ss')
        });
      });

      emailer.userMention(model.user.getEmail(), messages, events[0]['data']['name'], cloudinary.roomAvatar(events[0]['data']['room_avatar'], 90), callback);
    },

    function persist(callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], done);
};