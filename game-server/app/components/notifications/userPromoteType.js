var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var async = require('async');
var User = require('../../../../shared/models/user');
var Room = require('../../../../shared/models/room');
var NotificationModel = require('../../../../shared/models/notification');
var emailer = require('../../../../shared/io/emailer');
var utils = require('./utils');
var mongoose = require('../../../../shared/io/mongoose');

var FREQUENCY_LIMITER = 0; // 0mn

module.exports = function(facade) {
  return new Notification(facade);
};

var Notification = function(facade) {
  this.facade = facade;
};

Notification.prototype.type = 'userpromote';

Notification.prototype.shouldBeCreated = function(type, user, data) {

  var that = this;
  async.waterfall([

    function checkOwn(callback) {
      if (data.from_user_id == user._id.toString()) {
        logger.debug('no notification due to my own message');
        return utils.waterfallDone(null);
      }
      else
        return callback(null);
    },

    function checkPreferences(callback) {
      if (!user.preferencesValue('notif:userpromote')) {
        logger.debug('no notification due to user preferences');
        return utils.waterfallDone(null);
      }
      else
        return callback(null);
    },

    // No repetitive check cause FREQUENCY_LIMITER is equal to 0
    //utils.checkRepetitive(type, user, { 'data.name': data.room.name, 'data.by_user_id': data.event.by_user_id }, FREQUENCY_LIMITER),

    function checkStatus(callback) {
      that.facade.app.statusService.getStatusByUid(user._id.toString(), function(err, status) {
        if (err)
          return utils.waterfallDone('Error while retrieving user status: '+err);

        return callback(null, status);
      });
    },

    function prepare(status, callback) {

      var model = NotificationModel.getNewModel(type, user, {event: mongoose.Types.ObjectId(data.event.id)});

      model.to_browser = user.preferencesValue("notif:channels:desktop");
      model.to_email = false; // Do not send email, finally // (status ? false : user.preferencesValue("notif:channels:email"));
      model.to_mobile = (status ? false : user.preferencesValue("notif:channels:mobile"));

      model.save(function(err) {
        if (err)
          return utils.waterfallDone('Error while saving: '+err);

        logger.info('notification created: '+type+' for '+user.username);

        if (!model.sent_to_browser)
          that.sendToBrowser(model);

        callback(null);
      });
    }

  ], utils.waterfallDone);
};

Notification.prototype.sendToBrowser = function(model) {

  var userId = model.user.toString();

  var that = this;

  async.waterfall([

    utils.retrieveEvent('historyone', model.data.event.toString() ),

    utils.retrieveUser(userId),

    function prepare(event, user, callback) {

      var byUser = event.from;

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
          }
        }
      };

      return callback(null, notification);
    },

    function push(notification, callback) {
      that.facade.app.globalChannelService.pushMessage('connector', 'notification:new', notification, 'user:'+userId, {}, function(err) {
        if (err)
          return utils.waterfallDone('Error while sending notification:new message to user clients: '+err);

        logger.debug('notification sent: '+notification);

        callback(null);
      });
    }

  ], utils.waterfallDone);

};

/**
 * Will send a Notification by Email
 *
 * @param model Notification
 */
Notification.prototype.sendEmail = function(model) {

  var to, username;

  if (!model.data || !model.data.event)
    return logger.error('Wrong structure for notification model');

  async.waterfall([

    utils.retrieveEvent('historyone', model.data.event.toString() ),

    function send(event, callback) {
      to = event.to.getEmail();
      username = event.from.username;

      switch(model.type) {

        case 'userban':
          return emailer.userBan(to, username, callback);
        break;
        case 'userdeban':
          return emailer.userDeban(to, username, callback);
        break;
        default:
          return callback('userPromoteType :: Unknown notification type: '+model.type);
        break;
      }
    },

    function saveOnUser(callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], utils.waterfallDone);

};

Notification.prototype.sendMobile = function() {

};