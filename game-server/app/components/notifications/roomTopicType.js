var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var async = require('async');
var User = require('../../../../shared/models/user');
var NotificationModel = require('../../../../shared/models/notification');
var emailer = require('../../../../shared/io/emailer');
var utils = require('./utils');
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
      _.each(users, function (user) {
        var model = NotificationModel.getNewModel(that.type, user, {event: mongoose.Types.ObjectId(data.event.id)});

        model.to_browser = true;
        model.to_email = ( !user.getEmail() ? false : ( statuses[user.id] ? false : user.preferencesValue("notif:channels:email")));
        model.to_mobile = (statuses[user.id] ? false : user.preferencesValue("notif:channels:mobile"));

        model.save(function (err) {
          if (err)
            return utils.waterfallDone(err);

          logger.info('notification created: ' + that.type + ' for ' + user.username);

          if (!model.sent_to_browser)
            that.sendToBrowser(model);

          callback(null);
        });
      });
    }
  ], function(err) {
    if (err && err !== true)
      return done(err);

    return done(null);
  });

};

Notification.prototype.sendToBrowser = function (model, done) {

  var userId = model.user.toString();
  var room, byUser;
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
        to_browser: user.preferencesValue('notif:channels:desktop'),
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

  ], done);

};

Notification.prototype.sendEmail = function (model, done) {
  return done('null'); // @todo dbr

  var to = model.user.getEmail();
  var from, room;

  if (!model.data || !model.data.event)
    return logger.error('Wrong structure for notification model');

  async.waterfall([

    utils.retrieveEvent('historyroom', model.data.event.toString()),

    function send(event, callback) {
      from = event.user.username;
      room = event.room;

      emailer.roomTopic(to, from, room, callback);
    },

    function saveOnUser(callback) {
      model.sent_to_email = true;
      model.sent_to_email_at = new Date();
      model.save(callback);
    }

  ], done);

};