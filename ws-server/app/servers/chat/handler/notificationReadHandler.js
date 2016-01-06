'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
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

    function retrieve (callback) {
      Notifications(that.app).retrieveUserNotifications(user.id, data, callback);
    },

    function retrieveMore (notifications, callback) {
      Notifications(that.app).retrieveUserNotificationsCount(user.id, data.time, function (err, count) {
        callback(err, notifications, (count > notifications.length));
      });
    },

    function retrieveUnreadCount (notifications, more, callback) {
      Notifications(that.app).retrieveUserNotificationsUnviewedCount(user.id, function (err, count) {
        return callback(err, notifications, more, count);
      });
    },

    function prepare (notifications, more, count, callback) {
      var event = {
        notifications: [],
        unread: count,
        more: more
      };
      _.each(notifications, function (notification) {
        var d = {
          id: notification.id,
          type: notification.type,
          time: notification.time,
          viewed: notification.viewed,
          data: {}
        };

        if (notification.data.event) {
          if (notification.data.event.from) {
            d.data.by_user = notification.data.event.from;
            d.data.by_user.avatar = notification.data.event.from._avatar();
          }

          if (notification.data.event.to) {
            d.data.user = notification.data.event.to;
            d.data.user.avatar = notification.data.event.to._avatar();
          }

          if (notification.data.event.user) {
            d.data.user = notification.data.event.user;
            d.data.user.avatar = notification.data.event.user._avatar();
          }

          if (notification.data.event.by_user) {
            d.data.by_user = notification.data.event.by_user;
            d.data.by_user.avatar = notification.data.event.by_user._avatar();
          }

          if (notification.data.event.room) {
            d.data.room = notification.data.event.room;
            d.data.room.avatar = notification.data.event.room._avatar();
            d.data.room.name = notification.data.event.room.getIdentifier();
          }

          if (notification.data.event && notification.data.event.data && notification.data.event.data.message) {
            d.data.message = notification.data.event.data.message;
          }
        } else {
          if (notification.data.user) {
            d.data.user = notification.data.user;
            d.data.user.avatar = notification.data.user._avatar();
          }

          if (notification.data.room) {
            d.data.room = notification.data.room;
            d.data.room.avatar = notification.data.room._avatar();
            d.data.room.name = notification.data.room.getIdentifier();
          } else if (notification.data.group) {
            d.data.group = notification.data.group;
            d.data.group.avatar = notification.data.group._avatar();
          }

          if (notification.data.by_user) {
            d.data.by_user = notification.data.by_user;
            d.data.by_user.avatar = notification.data.by_user._avatar();
          }
        }
        event.notifications.push(d);
      });

      return callback(null, event);
    },

    function broadcast (event, callback) {
      that.app.globalChannelService.pushMessage('connector', 'notification:read', event, 'user:' + user.id, {}, function (err) {
        return callback(err, event);
      });
    }

  ], function (err, event) {
    if (err) {
      return errors.getHandler('notification:read', next)(err);
    }

    next(null, event);
  });
};
