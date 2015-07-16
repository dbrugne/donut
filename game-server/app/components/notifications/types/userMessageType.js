var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var cloudinary = require('../../../../../shared/cloudinary/cloudinary');
var _ = require('underscore');
var async = require('async');
var utils = require('./../utils');
var emailer = require('../../../../../shared/io/emailer');
var moment = require('../../../../../shared/util/moment');
var conf = require('../../../../../config/index');
var NotificationModel = require('../../../../../shared/models/notification');
var HistoryOneModel = require('../../../../../shared/models/historyone');

module.exports = function(facade) {
  return new Notification(facade);
};

var Notification = function(facade) {
  this.facade = facade;
};

Notification.prototype.create = function(user, history, done) {
  var that = this;
  async.waterfall([

    utils.retrieveUser(user),

    utils.retrieveHistoryOne(history),

    function checkOwn(userModel, historyModel, callback) {
      if (historyModel.from.id == userModel.id) {
        logger.debug('userMessageType.create no notification due to my own message');
        return callback(true);
      }

      return callback(null, userModel, historyModel);
    },

    function checkPreferences(userModel, historyModel, callback) {
      if (!userModel.preferencesValue('notif:usermessage')) {
        logger.debug('userMessageType.create no notification due to user preferences');
        return callback(true);
      }

      return callback(null, userModel, historyModel);
    },

    function avoidRepetitive(userModel, historyModel, callback) {
      var criteria = {
        type: that.type,
        time: {
          $gte: new Date((Date.now() - 1000 * conf.notifications.types.usermessage.creation))
        },
        'data.from': historyModel.from._id
      };
      NotificationModel.findOne(criteria).count(function (err, count) {
        if (err)
          return callback(err);
        if (count) {
          logger.debug('userMessageType.create no notification creation due to repetitive');
          return callback(true);
        }

        return callback(null, userModel, historyModel);
      });
    },

    function checkStatus(userModel, historyModel, callback) {
      that.facade.uidStatus(userModel.id, function(status) {
        if (status) {
          logger.debug('userMessageType.create no notification due to user status');
          return callback(true);
        }

        return callback(null, userModel, historyModel, status);
      });
    },

    function save(userModel, historyModel, status, callback) {
      var model = NotificationModel.getNewModel(that.type, userModel, {
        event: historyModel._id,
        from: historyModel.from // for repetitive
      });
      model.to_browser = true; // will be displayed in browser on next connection
      model.to_email =  (!userModel.getEmail() ? false : ( status ? false : userModel.preferencesValue("notif:channels:email"))) ;
      model.to_mobile = (status ? false : userModel.preferencesValue("notif:channels:mobile"));
      model.save(function(err) {
        if (err)
          return callback(err);

        logger.debug('userMessageType.create notification created for user '+userModel.username);
        return callback(null);
      });
    }

  ], function(err) {
    if (err && err !== true)
      return done(err);

    return done(null);
  });

};

Notification.prototype.sendEmail = function(model, done) {
  if (!model.data || !model.data.event)
    return logger.error('userMessageType.sendEmail data.event left');

  async.waterfall([

    utils.retrieveHistoryOne(model.data.event.toString()),

    function retrieveEvents(history, callback) {
      HistoryOneModel.retrieveEventWithContext(history.id, 5, 10, true, function(err, events) {
        if (err)
          return callback(err);

        return callback(null, history, events);
      });
    },

    function mentionize(history, events, callback) {
      var reg = /@\[([^\]]+)\]\(user:[^)]+\)/g; // @todo dbr bundle mentionnize, linkify... other messages transfomrmation in a common class loadable in npm and bower
      _.each(events, function(event, index, list) {
        if (!event.data.message)
          return;

        list[index].data.message = list[index].data.message.replace(reg, "<strong><a style=\"color:"+conf.room.default.color+";\"href=\""+conf.url+"/user/$1\">@$1</a></strong>");
      });

      callback(null, history, events);
    },

    function send(history, events, callback) {
      var messages = [];
      _.each (events, function(event){
        var isCurrentMessage = (history.id == event.data.id)
          ? true
          : false;
        messages.push({
          current: isCurrentMessage,
          from_avatar: cloudinary.userAvatar(event.data.from_avatar, 90),
          from_username: event.data.from_username,
          message: event.data.message,
          to_avatar: cloudinary.userAvatar(event.data.to_avatar, 90),
          to_username: event.data.to_username,
          time_short: moment(event.data.time).format('Do MMMM, HH:mm'),
          time_full: moment(event.data.time).format('dddd Do MMMM YYYY à HH:mm:ss')
        });
      });

      emailer.userMessage(model.user.getEmail(), model.user.username, messages, callback);
    },

    function persist(callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], done);

};