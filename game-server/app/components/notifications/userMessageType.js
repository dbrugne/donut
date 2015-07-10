var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var cloudinary = require('../../../../shared/cloudinary/cloudinary');
var _ = require('underscore');
var async = require('async');
var User = require('../../../../shared/models/user');
var NotificationModel = require('../../../../shared/models/notification');
var HistoryOneModel = require('../../../../shared/models/historyone');
var emailer = require('../../../../shared/io/emailer');
var utils = require('./utils');
var moment = require('../../../../shared/util/moment');
var conf = require('../../../../config');
var mongoose = require('../../../../shared/io/mongoose');

var FREQUENCY_LIMITER = 15; // 15mn

module.exports = function(facade) {
  return new Notification(facade);
};

var Notification = function(facade) {
  this.facade = facade;
};

Notification.prototype.type = 'usermessage';

Notification.prototype.shouldBeCreated = function(type, user, data) {

  var that = this;
  async.waterfall([

      function checkOwn(callback) {
        if (data.from_user_id == user._id.toString())
          return callback('no notification due to my own message');
        else
          return callback(null);
      },

      function checkPreferences(callback) {
        if (!user.preferencesValue('notif:usermessage'))
          return callback('no notification due to user preferences');
        else
          return callback(null);
      },

      utils.checkRepetitive(type, user, { 'data.from_user_id': data.from_user_id }, FREQUENCY_LIMITER),

      function checkStatus(callback) {
        that.facade.uidStatus(user._id.toString(), function(status) {
          if (status)
            return callback('no notification due to user status'); // create only if user is offline

          return callback(null, status);
        });
      },

      function prepare(status, callback) {
        var model = NotificationModel.getNewModel(type, user, {event: mongoose.Types.ObjectId(data.id)});

        model.to_browser = false;
        model.to_email =  ( !user.getEmail() ? false : ( status ? false : user.preferencesValue("notif:channels:email"))) ;
        model.to_mobile = (status ? false : user.preferencesValue("notif:channels:mobile"));

        model.save(callback);
      }

  ], function(err) {
    if (err)
      return logger.error('Error happened in userMessageType|shouldBeCreated : '+err);
  });

};

Notification.prototype.sendToBrowser = function(model) {
  // never delivered to browser (targeted user should be offline)
};

Notification.prototype.sendEmail = function(model) {

  var to, username;

  if (!model.data || !model.data.event)
    return logger.error('Wrong structure for notification model');

  async.waterfall([

    utils.retrieveEvent('historyone', model.data.event.toString() ),

    function retrieveEventsWithContext(event, callback) {
      to = event.to.getEmail();
      username = event.from.username;

      HistoryOneModel.retrieveEventWithContext(model.data.event.toString(), 5, 10, true, callback);
    },

    function mentionize(events, callback) {
      var reg = /@\[([^\]]+)\]\(user:[^)]+\)/g; // @todo yls from config

      _.each(events, function(event, index, list) {
        if (!event.data.message)
          return;

        list[index].data.message = list[index].data.message.replace(reg, "<strong><a style=\"color:"+conf.room.default.color+";\"href=\""+conf.url+"/user/$1\">@$1</a></strong>");
      });

      callback(null, events);
    },

    function prepare(events, callback) {
      var messages = [];
      _.each (events, function(event){
        messages.push({
          current: (model.data.event.toString() === event.data.id),
          from_avatar: cloudinary.userAvatar(event.data.from_avatar, 90),
          from_username: event.data.from_username,
          message: event.data.message,
          to_avatar: cloudinary.userAvatar(event.data.to_avatar, 90),
          to_username: event.data.to_username,
          time_short: moment(event.data.time).format('Do MMMM, HH:mm'),
          time_full: moment(event.data.time).format('dddd Do MMMM YYYY à HH:mm:ss')
        });
      });

      return callback(null, messages);
    },

    function send(messages, callback) {
      emailer.userMessage(to, username, messages, callback);
    },

    function saveOnUser(callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], function(err) {
    if (err)
      return logger.error('Error happened in userMessageType|sendEmail : '+err);
  });

};

Notification.prototype.sendMobile = function() {

};