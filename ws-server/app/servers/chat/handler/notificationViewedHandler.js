'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
var Notifications = require('../../../components/notifications');
var common = require('@dbrugne/donut-common/server');

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
      // Mark all as read
      if (data.all) {
        Notifications(that.app).retrieveUserNotificationsUnviewed(user.id, function (err, notifications) {
          if (err) {
            return callback(err);
          }

          return callback(null, notifications);
        });
      } else {
        var notifications = [];
        if (!data.ids || !_.isArray(data.ids)) {
          return callback('params-ids');
        }

        // filter array to preserve only valid
        _.each(data.ids, function (element) {
          if (common.validate.objectId(element)) {
            notifications.push(element);
          }
        });

        // test if at least one entry remain
        if (notifications.length === 0) {
          return callback('notification-not-found');
        }

        return callback(null, notifications);
      }
    },

    function persist (notifications, callback) {
      Notifications(that.app).markNotificationsAsViewed(user.id, notifications, function (err) {
        return callback(err, notifications);
      });
    },

    function retrieveUnreadCount (notifications, callback) {
      Notifications(that.app).retrieveUserNotificationsUnviewedCount(user.id, function (err, count) {
        return callback(err, notifications, count);
      });
    },

    function broadcast (notifications, count, callback) {
      var event = {
        unread: count || 0,
        notifications: notifications
      };

      that.app.globalChannelService.pushMessage('connector', 'notification:viewed', event, 'user:' + user.id, {}, function (err) {
        return callback(err, event);
      });
    }
  ], function (err, event) {
    if (err) {
      return errors.getHandler('notification:viewed', next)(err);
    }

    next(null, event);
  });
};
