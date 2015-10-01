'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var NotificationModel = require('../../../../../shared/models/notification');
var Notifications = require('../../../components/notifications');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.id) {
        return callback('params-id');
      }

      NotificationModel.findOne({_id: data.id}, function (err, notification) {
        if (err) {
          return callback('Error while retrieving notification: ' + err);
        }

        if (notification.user.toString() !== user.id) {
          return callback('no-right-user');
        }

        return callback(null, notification);
      });
    },

    function markAsDone (notification, callback) {
      Notifications(that.app).markNotificationsAsDone(user.id, [notification.id], function (err) {
        return callback(err, notification);
      });
    },

    function broadcast (notification, callback) {
      var event = {
        notification: notification.id
      };
      that.app.globalChannelService.pushMessage('connector', 'notification:done', event, 'user:' + user.id, {}, function (err) {
        return callback(err, event);
      });
    }

  ], function (err, event) {
    if (err) {
      return errors.getHandler('notification:done', next)(err);
    }

    next(null, event);
  });
};
