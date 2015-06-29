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
        var wet = _.clone(data);
        var dry = _.omit(wet, [
          'time',
          'to',
          'from',
          'from_username',
          'from_avatar',
          'to_username',
          'message'
        ]);

        if (wet.to_user_id)
          dry.user = wet.to_user_id;
        if (wet.from_user_id)
          dry.by_user = wet.from_user_id;

        var model = NotificationModel.getNewModel(type, user, dry);

        model.to_browser = false;
        model.to_email = (status ? false : user.preferencesValue("notif:channels:email"));
        model.to_mobile = (status ? false : user.preferencesValue("notif:channels:mobile"));

        model.save(function(err) {
            return callback (err);
        });
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

  var to = model.data.user.local.email;
  var from = model.data.by_user.username;

  async.waterfall([

    function retrieveEvents(callback) {
      HistoryOneModel.retrieveEventWithContext(model.data.id, 5, 10, true, callback);
    },

    function prepare(events, callback) {
      var messages = [];
      var from_avatar = null;
      var to_avatar = null;
      _.each (events, function(event){
        messages.push({
          current: (model.data.id === event.data.id),
          from_avatar: from_avatar || (from_avatar = cloudinary.userAvatar(event.data.from_avatar, 90)),
          from_username: event.data.from_username,
          message: event.data.message,
          to_avatar: to_avatar || (to_avatar = cloudinary.userAvatar(event.data.to_avatar, 90)),
          to_username: event.data.to_username,
          time_short: moment(event.data.time).format('Do MMMM, HH:mm'),
          time_full: moment(event.data.time).format('dddd Do MMMM YYYY à HH:mm:ss')
        });
      });

      return callback(null, messages);
    },

    function send(messages, callback) {
      emailer.userMessage(to, from, messages, callback);
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