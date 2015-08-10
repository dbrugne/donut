var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var NotificationModel = require('../../../../../shared/models/notification');
var Notifications = require('../../../components/notifications');
var common = require('donut-common');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.read = function (data, session, next) {

  var user = session.__currentUser__;

  var that = this;

  async.waterfall([

    function retrieve(callback) {
      Notifications(that.app).retrieveUserNotifications(user.id, data, callback);
    },

    function prepare(notifications, more, callback) {
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

    function unviewed(event, callback) {
      Notifications(that.app).retrieveUserNotificationsUnviewedCount(user.id, function (err, count) {
        if (err)
          return callback(err);

        event.unviewed = count || 0;
        return callback(null, event);
      });
    }

  ], function (err, event) {
    if (err) {
      logger.error('[user:notifications:read] ' + err);
      return next(null, {code: 500, err: err});
    }

    next(null, event);
  });

};

handler.viewed = function (data, session, next) {

  var user = session.__currentUser__;

  var that = this;

  async.waterfall([

    function check(callback) {
      // Mark all as read
      if (data.all) {
        Notifications(that.app).retrieveUserNotificationsUnviewed(user.id, function (err, notifications) {
          if (err)
            return callback(err);

          return callback(null, notifications);
        });
      } else {
        var notifications = [];
        if (!data.ids || !_.isArray(data.ids))
          return callback('ids parameter is mandatory for notifications:viewed');

        // filter array to preserve only valid
        _.each(data.ids, function (elt) {
          if (common.objectIdPattern.test(elt))
            notifications.push(elt);
        });

        // test if at least one entry remain
        if (notifications.length == 0)
          return callback('No notification to set as Read remaining');

        return callback(null, notifications);
      }
    },

    function persist(notifications, callback) {
      Notifications(that.app).markNotificationsAsViewed(user.id, notifications, function (err) {
        return callback(err, notifications);
      });
    },

    function prepare(notifications, callback) {
      // count remaining unviewed notifications
      Notifications(that.app).retrieveUserNotificationsUnviewedCount(user.id, function (err, count) {
        if (err)
          return callback(err);

        return callback(null, {
          notifications: notifications,
          unviewed: count || 0
        });
      });
    }

  ], function (err, event) {
    if (err) {
      logger.error('[user:notifications:viewed] ' + err);
      return next(null, {code: 500, err: err});
    }

    next(null, event);
  });

};

handler.done = function (data, session, next) {

  var user = session.__currentUser__;

  var that = this;

  async.waterfall([

    function check(callback) {

      if (!data.id)
        return callback('id parameter is mandatory for notifications:done');

      NotificationModel.findOne({_id: data.id}, function (err, notification) {
        if (err)
          return callback('Error while retrieving notification: ' + err);

        if (notification.user.toString() !== user.id)
          return callback('This notification is not associated to this user');

        return callback(null, notification);
      });
    },

    function markAsDone(notification, callback) {
      Notifications(that.app).markNotificationsAsDone(user.id, [notification.id], function (err) {
        return callback(err, notification);
      });
    },

    function broadcast(notification, callback) {
      var event = {
        notification: notification.id
      };
      that.app.globalChannelService.pushMessage('connector', 'notification:done', event, 'user:' + user.id, {}, function (err) {
        return callback(err, event);
      });
    }

  ], function (err, event) {
    if (err) {
      logger.error('[user:notifications:done] ' + err);
      return next(null, {code: 500, err: err});
    }

    next(null, event);
  });

};