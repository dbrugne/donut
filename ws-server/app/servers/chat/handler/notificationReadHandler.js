'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
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
      Notifications(that.app).retrieveUserNotificationsUnviewedCount(user.id, function (err, count) {
        callback(err, notifications, (count > notifications.length));
      });
    },

    function prepare (notifications, more, callback) {
      var event = {
        notifications: [],
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
        }

        if (notification.data.event && notification.data.event.data && notification.data.event.data.message) {
          d.data.message = notification.data.event.data.message;
        }

        event.notifications.push(d);
      });

      return callback(null, event);
    },

    function unviewed (event, callback) {
      Notifications(that.app).retrieveUserNotificationsUnviewedCount(user.id, function (err, count) {
        if (err)
          return callback(err);

        event.unviewed = count || 0;
        return callback(null, event);
      });
    }

  ], function (err, event) {
    if (err) {
      logger.error('[notification:read] ' + err);
      return next(null, {code: 500, err: err});
    }

    next(null, event);
  });

};
